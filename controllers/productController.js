const jwt = require("jsonwebtoken");
const bizSdk = require("facebook-nodejs-business-sdk");
const { createHash } = require("crypto");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Users = require("../models/userModel");
const Reviews = require("../models/reviewModel");
const Products = require("../models/productModel");
const Wishlists = require("../models/wishlistModel");
const Attributes = require("../models/attributeModel");
const Categories = require("../models/categoryModel");

const filterQuery = require("../utils/filterQuery");
const handleUpload = require("../utils/uploadImage");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

exports.getProductFilters = catchAsyncErrors(async (req, res, next) => {
  return res.status(200).json({
    attributes: await Attributes.find().sort({ createdAt: -1 }),
    categories: await Categories.find().sort({ createdAt: -1 }),
  });
});

exports.getProducts = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const sort = params.get("sort");

  const {
    data: products,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  } = await filterQuery(
    searchParams,
    ["name", "category"],
    Products,
    sort,
    "and"
  );

  return res.status(200).json({
    products,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  });
});

exports.addProduct = catchAsyncErrors(async (req, res, next) => {
  const {
    name,
    shortDescription,
    fullDescription,
    price,
    isFeatured,
    category,
    tags: unTags,
    variants: unVariants,
    combinations: unCombinations,
    images,
    _id,
  } = req.body;

  const tags = JSON.parse(unTags);
  const variants = JSON.parse(unVariants);
  const combinations = JSON.parse(unCombinations);

  const images1 = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const key = `Images/${file.fieldname}_${Date.now()}.jpg`;

    const params = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentDisposition: "inline",
      ContentType: "image/jpeg",
    });
    await s3Client.send(params);
    // const b64 = Buffer.from(file.buffer).toString("base64");
    // const dataURI = "data:" + file.mimetype + ";base64," + b64;
    // const cldRes = await handleUpload(dataURI);
    const icon = {
      id: key,
      link: `https://essentialsbyla.s3.ap-south-1.amazonaws.com/${key}`,
    };
    images1.push(icon);
  }

  let newImages = [];

  if (images) {
    newImages = images1.concat(JSON.parse(images));
  }

  if (_id) {
    await Products.updateOne(
      { _id: _id },
      {
        $set: {
          name,
          category,
          combinations,
          fullDescription,
          images: newImages.length ? newImages : images1,
          isFeatured: isFeatured === "yes",
          price: +price,
          shortDescription,
          tags,
          variants,
        },
      }
    );

    return res
      .status(200)
      .json({ success: true, product: await Products.findOne({ _id: _id }) });
  }

  const newProduct = new Products({
    category,
    fullDescription,
    images: newImages.length ? newImages : images1,
    isFeatured: isFeatured === "yes",
    name,
    price: +price,
    shortDescription,
    tags,
    variants,
    combinations,
  });

  await newProduct.save();
  return res.status(200).json({ success: true, product: newProduct });
});

exports.deleteProduct = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.body;

  await Products.deleteOne({ _id: _id });

  return res.status(200).json({ success: true });
});

exports.getProduct = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.query;

  const product = await Products.findOne({ _id: id, inStock: true });
  const token = req.cookies.token;

  let totalRating = 0;
  let productReviews = [];
  let relatedProducts = [];
  let sumOfRating = 0;

  if (product) {
    productReviews = await Reviews.find({ productId: product._id });
    const sumOfMaxRatingOfUserCount = productReviews.length * 5;
    for (let i = 0; i < productReviews.length; i++) {
      const review = productReviews[i];
      sumOfRating = sumOfRating + review.rating;
    }

    totalRating = Math.ceil((sumOfRating * 5) / sumOfMaxRatingOfUserCount);
  }

  if (product) {
    relatedProducts = await Products.find({
      $and: [
        { inStock: true },
        {
          _id: { $ne: product?._id },
        },
        {
          $or: [
            {
              category: product?.category,
            },
            {
              name: {
                $regex: product?.name || "",
                $options: "i",
              },
            },
            {
              "tags.tag": {
                $in: product?.tags.map((tag) => tag.tag),
              },
            },
          ],
        },
        { inStock: true },
      ],
    }).limit(4);
  }

  if (!token) {
    return res.status(200).json({
      ...product?._doc,
      reviews: productReviews,
      totalRating,
      relatedProducts,
    });
  }

  let user = undefined;
  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    user = await Users.findOne(
      { _id: decodedData.id, role: "customer" },
      { password: 0 }
    );
  } catch {
    res.cookie("token", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
  }

  if (user) {
    const inWishlist = await Wishlists.findOne({
      uid: user._id,
      products: { $elemMatch: { productId: id } },
    });

    const newRelatedProducts = [];

    for (let i = 0; i < relatedProducts.length; i++) {
      const relatedProduct = relatedProducts[i];

      const inWishlist = await Wishlists.findOne({
        uid: user._id,
        products: { $elemMatch: { productId: relatedProduct._id } },
      });

      newRelatedProducts.push({
        ...relatedProduct._doc,
        inWishlist: inWishlist ? true : false,
      });
    }

    const ServerEvent = bizSdk.ServerEvent;
    const CustomData = bizSdk.CustomData;
    const EventRequest = bizSdk.EventRequest;
    const UserData = bizSdk.UserData;

    const access_token = process.env.PIXEL_ACCESS_TOKEN;
    const pixel_id = process.env.PIXEL_ID;
    const api = bizSdk.FacebookAdsApi.init(access_token);

    let current_timestamp = Math.floor(new Date() / 1000);
    const userData_0 = new UserData()
      .setEmails([createHash("sha256").update(user.email).digest("hex")])
      .setPhones([createHash("sha256").update(user.phone).digest("hex")])
      .setDatesOfBirth([user.birthDate])
      .setLastNames([createHash("sha256").update(user.lname).digest("hex")])
      .setFirstNames([createHash("sha256").update(user.fname).digest("hex")])
      .setClientIpAddress(req.headers["x-real-ip"])
      .setClientUserAgent(req.get("user-agent"))
      .setGenders([
        createHash("sha256")
          .update(user.gender === "Male" ? "m" : "f")
          .digest("hex"),
      ])
      .setFbp(req.cookies["_fbp"])
      .setFbc(req.cookies["_fbc"]);

    const customData_0 = new CustomData()
      .setValue(product.combinations[0].salePrice)
      .setCurrency("INR")
      .setContentName(product.name);

    const serverEvent_0 = new ServerEvent()
      .setEventName("ViewContent")
      .setEventTime(current_timestamp)
      .setCustomData(customData_0)
      .setUserData(userData_0)
      .setActionSource("website")
      .setEventId(crypto.randomUUID())
      .setEventSourceUrl(
        "https://www.essentialsbyla.com/product/" + product._id
      );

    const eventsData = [serverEvent_0];
    const eventRequest = new EventRequest(access_token, pixel_id).setEvents(
      eventsData
    );
    eventRequest.execute().then(
      (response) => {
        console.log("Response: ", response);
      },
      (err) => {
        console.error("Error: ", err);
      }
    );

    return res.status(200).json({
      ...product?._doc,
      reviews: productReviews,
      inWishlist: product ? (inWishlist ? true : false) : undefined,
      totalRating,
      relatedProducts: newRelatedProducts,
    });
  }

  return res.status(200).json({
    ...product?._doc,
    reviews: productReviews,
    totalRating,
    relatedProducts,
  });
});

exports.updateInStock = catchAsyncErrors(async (req, res, next) => {
  const { _id, inStock } = req.body;

  await Products.updateOne({ _id: _id }, { $set: { inStock } });

  return res.status(200).json({ success: true });
});
