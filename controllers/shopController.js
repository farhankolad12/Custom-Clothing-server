const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const jwt = require("jsonwebtoken");
const bizSdk = require("facebook-nodejs-business-sdk");
const { createHash } = require("crypto");

const Users = require("../models/userModel");
const Products = require("../models/productModel");
const Wishlists = require("../models/wishlistModel");
const Categories = require("../models/categoryModel");
const Attributes = require("../models/attributeModel");

exports.shopPage = catchAsyncErrors(async (req, res, next) => {
  return res.status(200).json({
    categories: await Categories.find(),
    attributes: await Attributes.find(),
  });
});

exports.getCategoryProducts = catchAsyncErrors(async (req, res, next) => {
  const { searchParams, name: categoryName } = req.query;

  const params = new URLSearchParams(searchParams);
  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 12;

  const variants = params.get("variants")?.split(",") || [];
  const minPrice = params.get("min") || 0;
  const maxPrice = params.get("max") || Number.MAX_SAFE_INTEGER;

  if (
    !(await Categories.findOne({
      name: {
        $regex: categoryName.replaceAll("%20", " "),
        $options: "i",
      },
    }))
  ) {
    return res.status(200).json({ notCategory: true });
  }

  // console.log(variants);

  const sortQuery =
    params.get("sort-by") === "low-high"
      ? { "combinations.salePrice": 1 }
      : params.get("sort-by") === "high-low"
      ? { "combinations.salePrice": -1 }
      : params.get("sort-by") === "latest"
      ? { createdAt: -1 }
      : {};

  const filterQuery = {
    $and: [
      {
        category: {
          $regex: categoryName.replaceAll("%20", " "),
          $options: "i",
        },
      },
      {
        "variants.values.variant": {
          $in:
            variants.length && variants[0] !== ""
              ? variants
              : (await Attributes.find())
                  .map((attr) =>
                    attr.options.map((opt) => opt.variant).join(",")
                  )
                  .join(",")
                  .split(","),
        },
      },
      {
        "combinations.salePrice": { $gte: minPrice, $lte: maxPrice },
      },
      /* {
        $or: params.get("query")
          ? [
              {
                name: {
                  $regex: params.get("query") || "",
                  $options: "i",
                },
              },
              {
                "tags.tag": {
                  $regex: params.get("query").split(" ").join("-") || "",
                  $options: "i",
                },
              },
            ]
          : [{}],
      }, */
    ],
  };

  const totalDocuments = await Products.countDocuments(filterQuery);

  const products = await Products.find(filterQuery)
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort(sortQuery);

  const token = req.cookies.token;

  if (!token) {
    return res.status(200).json({
      products,
      totalPages: Math.ceil(totalDocuments / pageSize),
      currentPage,
      totalDocuments,
      startDocument: pageSize * (currentPage - 1) + 1,
      lastDocument: pageSize * (currentPage - 1) + products.length,
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

  const fProducts = [];

  if (user) {
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      const inWishlist = await Wishlists.countDocuments({
        uid: user._id,
        products: { $elemMatch: { productId: product._id } },
      });

      if (inWishlist > 0) {
        fProducts.push({ ...product._doc, inWishlist: true });
      } else {
        fProducts.push({ ...product._doc, inWishlist: false });
      }
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

    const customData_0 = new CustomData().setContentName(categoryName);

    const serverEvent_0 = new ServerEvent()
      .setEventName("PageView")
      .setEventTime(current_timestamp)
      .setCustomData(customData_0)
      .setUserData(userData_0)
      .setActionSource("website")
      .setEventId(crypto.randomUUID())
      .setEventSourceUrl(
        "https://www.essentialsbyla.com/collections/" + categoryName
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
  }

  return res.status(200).json({
    products: user ? fProducts : products,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + products.length,
  });
});

exports.filterProducts = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 9;

  const category = params.get("category")?.split(",") || [];
  const variants = params.get("variants")?.split(",") || [];
  const minPrice = params.get("min") || 0;
  const maxPrice = params.get("max") || Number.MAX_SAFE_INTEGER;

  // console.log(variants);

  const sortQuery =
    params.get("sort-by") === "low-high"
      ? { price: 1 }
      : params.get("sort-by") === "high-low"
      ? { price: -1 }
      : params.get("sort-by") === "latest"
      ? { createdAt: -1 }
      : {};

  const filterQuery = {
    $and: [
      {
        category: {
          $in:
            category.length && category[0] !== ""
              ? category
              : (await Categories.find()).map((cat) => cat.name),
        },
      },
      {
        "variants.values.variant": {
          $in:
            variants.length && variants[0] !== ""
              ? variants
              : (await Attributes.find())
                  .map((attr) =>
                    attr.options.map((opt) => opt.variant).join(",")
                  )
                  .join(",")
                  .split(","),
        },
      },
      {
        "combinations.salePrice": { $gte: minPrice, $lte: maxPrice },
      },
      {
        $or: params.get("query")
          ? [
              {
                name: {
                  $regex: params.get("query") || "",
                  $options: "i",
                },
              },
              {
                "tags.tag": {
                  $regex: params.get("query").split(" ").join("-") || "",
                  $options: "i",
                },
              },
            ]
          : [{}],
      },
    ],
  };

  const totalDocuments = await Products.countDocuments(filterQuery);

  const products = await Products.find(filterQuery)
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort(sortQuery);

  const token = req.cookies.token;

  if (!token) {
    return res.status(200).json({
      products,
      totalPages: Math.ceil(totalDocuments / pageSize),
      currentPage,
      totalDocuments,
      startDocument: pageSize * (currentPage - 1) + 1,
      lastDocument: pageSize * (currentPage - 1) + products.length,
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

  const fProducts = [];

  if (user) {
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      const inWishlist = await Wishlists.countDocuments({
        uid: user._id,
        products: { $elemMatch: { productId: product._id } },
      });

      if (inWishlist > 0) {
        fProducts.push({ ...product._doc, inWishlist: true });
      } else {
        fProducts.push({ ...product._doc, inWishlist: false });
      }
    }
  }

  return res.status(200).json({
    products: user ? fProducts : products,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + products.length,
  });
});
