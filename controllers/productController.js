const jwt = require("jsonwebtoken");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Users = require("../models/userModel");
const Reviews = require("../models/reviewModel");
const Products = require("../models/productModel");
const Wishlists = require("../models/wishlistModel");
const Attributes = require("../models/attributeModel");
const Categories = require("../models/categoryModel");

const filterQuery = require("../utils/filterQuery");
const handleUpload = require("../utils/uploadImage");

exports.getProductFilters = catchAsyncErrors(async (req, res, next) => {
  return res.status(200).json({
    attributes: await Attributes.find().sort({ createdAt: -1 }),
    categories: await Categories.find().sort({ createdAt: -1 }),
  });
});

exports.getAllProducts = catchAsyncErrors(async (req, res, next) => {
  const allProducts = await Products.find({}, { _id: 1 });

  return res.status(200).json(allProducts);
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

  console.log(req.body);

  const tags = JSON.parse(unTags);
  const variants = JSON.parse(unVariants);
  const combinations = JSON.parse(unCombinations);

  const images1 = [];

  for (let i = 0; i < req.files.length; i++) {
    const file = req.files[i];
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    const icon = { id: cldRes.public_id, link: cldRes.url };
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

  const product = await Products.findOne({ _id: id });
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
      ],
    }).limit(4);
  }

  if (!token) {
    return res.status(200).json({
      reviews: productReviews,
      totalRating,
      relatedProducts,
      ...product?._doc,
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
