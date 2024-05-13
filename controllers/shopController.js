const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const jwt = require("jsonwebtoken");

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
