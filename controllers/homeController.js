const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const jwt = require("jsonwebtoken");

const Cart = require("../models/cartModel");
const Users = require("../models/userModel");
const Products = require("../models/productModel");
const Newsletter = require("../models/newsletterModel");
const Categories = require("../models/categoryModel");
const Wishlists = require("../models/wishlistModel");
const HomePageContent = require("../models/homePageContentModel");

const handleUpload = require("../utils/uploadImage");

exports.updateHomePage = catchAsyncErrors(async (req, res, next) => {
  const { changeType, data } = req.body;

  const homePageContent = await HomePageContent.find();

  const imgFiles = req.files;

  const img1 = [];

  for (let i = 0; i < imgFiles.length; i++) {
    const file = imgFiles[i];
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    const icon = { id: cldRes.public_id, link: cldRes.url };
    img1.push({ icon, sliderId: file.fieldname });
  }

  if (!homePageContent.length) {
    const newData = new HomePageContent({
      [changeType]: JSON.parse(data).map((d) => {
        return {
          ...d,
          img: img1.filter((img) => +img.sliderId === +d.id)[0].icon,
        };
      }),
    });
    await newData.save();

    return res.status(200).json({ success: true });
  }

  // console.log(img1);

  switch (changeType) {
    case "headerText":
      await HomePageContent.updateOne(
        { _id: homePageContent[0]._id },
        { $set: { headerText: data } }
      );
      break;

    case "mainSliders":
      await HomePageContent.updateOne(
        { _id: homePageContent[0]._id },
        {
          $set: {
            mainSliders: img1.length
              ? JSON.parse(data).map((d) => {
                  return {
                    ...d,
                    img: d.img.id
                      ? d.img
                      : img1.filter((img) => +img.sliderId === +d.id)[0].icon,
                  };
                })
              : JSON.parse(data),
          },
        }
      );
      break;

    case "videoSection":
      await HomePageContent.updateOne(
        { _id: homePageContent[0]._id },
        {
          $set: {
            videoSection: {
              thumbnailImg: img1.filter(
                (img) => img.sliderId === "thumbnail"
              )[0].icon,
              video: img1.filter((img) => img.sliderId === "video")[0].icon,
            },
          },
        }
      );
      break;

    case "firstBanner":
      await HomePageContent.updateOne(
        { _id: homePageContent[0]._id },
        {
          $set: {
            firstBanner: {
              ...JSON.parse(data),
              img: img1.filter((img) => img.sliderId === "firstBannerImg")[0]
                .icon,
            },
          },
        }
      );
      break;

    case "secondBanner":
      await HomePageContent.updateOne(
        { _id: homePageContent[0]._id },
        {
          $set: {
            secondBanner: {
              ...JSON.parse(data),
              img: img1.filter((img) => img.sliderId === "secondBannerImg")[0]
                .icon,
            },
          },
        }
      );
      break;

    default:
      return res
        .status(500)
        .json({ success: false, message: "Unknow changeType given" });
  }

  return res.status(200).json({ success: true });
});

exports.homePage = catchAsyncErrors(async (req, res, next) => {
  const date = new Date();

  // Add five days to current date
  date.setDate(date.getDate() - 6);

  const myDate = new Date(date); // Your timezone!
  const myEpoch = myDate.getTime() / 1000.0;

  const featuredProducts = await Products.find({ isFeatured: true }).limit(8);
  const newCollections = await Products.find({
    createdAt: { $gte: myEpoch, $lte: Date.now() },
  })
    .skip(1)
    .limit(8);

  const categoriesC = await Categories.find();

  const categories = [];

  for (let i = 0; i < categoriesC.length; i++) {
    const category = categoriesC[i];

    const productsInCat = await Products.countDocuments({
      category: category.name,
    });

    categories.push({ ...category._doc, totalProducts: productsInCat });
  }

  const token = req.cookies.token;

  if (!token) {
    return res.status(200).json({
      featuredProducts: featuredProducts,
      newCollections,
      categories,
      homePageContent: await HomePageContent.findOne(),
    });
  }

  let user = undefined;
  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    // console.log(decodedData);

    user = await Users.findOne(
      { _id: decodedData?.id, role: "customer" },
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
  const cProducts = [];

  if (user) {
    for (let i = 0; i < featuredProducts.length; i++) {
      const product = featuredProducts[i];
      const collectionProduct = newCollections[i];

      const inWishlist = await Wishlists.countDocuments({
        uid: user._id,
        products: { $elemMatch: { productId: product._id } },
      });

      const inWishlist1 = await Wishlists.countDocuments({
        uid: user._id,
        products: { $elemMatch: { productId: collectionProduct?._id } },
      });

      if (inWishlist1 > 0) {
        if (collectionProduct) {
          cProducts.push({ ...collectionProduct?._doc, inWishlist: true });
        }
      } else {
        if (collectionProduct) {
          cProducts.push({ ...collectionProduct?._doc, inWishlist: false });
        }
      }

      if (inWishlist > 0) {
        fProducts.push({ ...product._doc, inWishlist: true });
      } else {
        fProducts.push({ ...product._doc, inWishlist: false });
      }
    }
  }

  return res.status(200).json({
    featuredProducts: user ? fProducts : featuredProducts,
    newCollections: user ? cProducts : newCollections,
    categories,
    homePageContent: await HomePageContent.findOne(),
  });
});

exports.getWishlists = catchAsyncErrors(async (req, res, next) => {
  const currentUser = req.user;

  const wishlists = await Wishlists.findOne({ uid: currentUser._id });

  const resWishlists = [];

  for (let i = 0; i < wishlists.products.length; i++) {
    const wishlistProduct = wishlists.products[i];

    const product = await Products.findOne({ _id: wishlistProduct.productId });

    resWishlists.push({ ...product._doc, inWishlist: true });
  }

  return res.status(200).json(resWishlists);
});

exports.deleteWishlist = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.body;
  const currentUser = req.user;

  await Wishlists.updateOne(
    { uid: currentUser._id },
    { $pull: { products: { productId } } }
  );

  return res.status(200).json({ success: true });
});

exports.updateWishlist = catchAsyncErrors(async (req, res, next) => {
  const { productId } = req.body;
  const currentUser = req.user;

  const inWishlist = await Wishlists.findOne({
    uid: currentUser._id,
  });

  if (
    inWishlist &&
    inWishlist.products.some((product) => product.productId === productId)
  ) {
    await Wishlists.updateOne(
      {
        uid: currentUser._id,
        products: { $elemMatch: { productId } },
      },
      {
        $pull: {
          products: { productId },
        },
      }
    );
  } else if (
    inWishlist &&
    !inWishlist.products.some((product) => product.productId === productId)
  ) {
    await Wishlists.updateOne(
      {
        uid: currentUser._id,
      },
      {
        $push: {
          products: {
            productId,
          },
        },
      }
    );
  } else {
    const newWishlist = new Wishlists({
      uid: currentUser._id,
      products: [
        {
          productId,
        },
      ],
    });

    await newWishlist.save();
  }

  return res.status(200).json({ success: true });
});

exports.getCart = catchAsyncErrors(async (req, res, next) => {
  const currentUser = req.user;

  const userCart = await Cart.findOne({ uid: currentUser._id });

  if (!userCart) {
    return res.status(200).json({ products: [] });
  }

  const resData = [];

  for (let i = 0; i < userCart?.products.length; i++) {
    const cartProduct = userCart.products[i];

    const product = await Products.findOne({ _id: cartProduct.productId });

    resData.push({
      ...product._doc,
      quantity: cartProduct.quantity,
      selectedVariantIds: cartProduct.selectedVariationIds,
      selectedCombination: cartProduct.selectedCombination,
    });
  }

  if (resData.length) {
    return res.status(200).json({
      ...userCart._doc,
      products: resData,
    });
  }

  return res.status(200).json({
    products: [],
  });
});

exports.updateCart = catchAsyncErrors(async (req, res, next) => {
  const { productId, selectedVariantIds, quantity, selectedCombination } =
    req.body;

  if (quantity === 0) {
    return res.status(401).json({
      success: false,
      message: "Please select quantity bigger than 0",
    });
  }

  const currentUser = req.user;

  const userCart = await Cart.findOne({ uid: currentUser._id });

  if (!userCart) {
    const newCart = new Cart({
      uid: currentUser._id,
      subTotalPrice: selectedCombination.salePrice * quantity,
      totalPrice: selectedCombination.salePrice * quantity,
      products: [
        {
          productId: productId,
          selectedVariationIds: selectedVariantIds,
          quantity,
          selectedCombination,
        },
      ],
    });

    // console.log("hello");

    await newCart.save();
    return res.status(200).json({ success: true });
  }

  // console.log("world");

  let updatedProducts = [];

  let isProductId = false;
  const subTotalPrice = userCart?.products.some(
    (productC) =>
      productC.productId === productId &&
      productC.selectedCombination.id === selectedCombination.id
  )
    ? (userCart?.subTotalPrice || 0) +
      selectedCombination.salePrice * quantity -
      selectedCombination.salePrice
    : (userCart?.subTotalPrice || 0) + selectedCombination.salePrice * quantity;

  await (async () => {
    userCart?.products.some(
      (productC) =>
        productC.productId === productId &&
        productC.selectedCombination.id === selectedCombination.id
    )
      ? (updatedProducts = userCart?.products.map((productC) => {
          isProductId = true;
          return productC.productId === productId &&
            productC.selectedCombination.id === selectedCombination.id
            ? { ...productC._doc, quantity }
            : productC._doc;
        }))
      : userCart?.products.some(
          (productC) =>
            productC.productId === productId &&
            productC.selectedCombination.id !== selectedCombination.id
        )
      ? (updatedProducts = [
          ...userCart?.products,
          {
            productId,
            quantity,
            selectedVariantIds,
            selectedCombination,
          },
        ])
      : [];
  })();

  if (!isProductId) {
    await Cart.updateOne(
      { uid: currentUser._id },
      {
        $push: {
          products: {
            productId: productId,
            selectedVariationIds: selectedVariantIds,
            selectedCombination,
            quantity,
          },
        },
        $set: {
          subTotalPrice,
        },
      }
    );

    return res.status(200).json({ success: true });
  }

  await Cart.updateOne(
    { uid: currentUser._id },
    {
      $set: {
        products: updatedProducts,
        subTotalPrice,
      },
    }
  );

  return res.status(200).json({ success: true });
});

exports.deleteCart = catchAsyncErrors(async (req, res, next) => {
  const { productId, selectedCombination, quantity } = req.body;
  const currentUser = req.user;

  const cartItems = await Cart.findOne({ uid: currentUser._id });

  await Cart.updateOne(
    { uid: currentUser._id },
    {
      $pull: { products: { "selectedCombination.id": selectedCombination.id } },
      $set: {
        subTotalPrice: cartItems?.products.some(
          (productC) =>
            productC.productId === productId &&
            productC.selectedCombination.id === selectedCombination.id
        )
          ? (cartItems?.subTotalPrice || 0) -
            selectedCombination.salePrice * quantity /*  -
              product.selectedCombination.salePrice */
          : (cartItems?.subTotalPrice || 0) +
            selectedCombination.salePrice * quantity,
      },
    }
  );

  return res.status(200).json({ success: true });
});

exports.updateNewsletter = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  if (await Newsletter.findOne({ email })) {
    return res
      .status(200)
      .json({ success: true, message: "Already subscribed" });
  }

  const newLetter = new Newsletter({
    email,
  });

  await newLetter.save();

  return res
    .status(200)
    .json({ success: true, message: "Successfully subscribed" });
});

exports.getProductsSitemap = catchAsyncErrors(async (req, res, next) => {
  const batchSize = 10;
  let skip = 0;
  let products = [];

  while (true) {
    const batchProducts = await Products.find({}, { _id: 1 })
      .skip(skip)
      .limit(batchSize);

    if (batchProducts.length === 0) {
      break;
    }

    products = products.concat(batchProducts);
    skip += batchSize;
  }

  return res.status(200).json(products);
});
