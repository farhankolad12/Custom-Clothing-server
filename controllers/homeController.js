const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const jwt = require("jsonwebtoken");
const { createHash } = require("crypto");
const bizSdk = require("facebook-nodejs-business-sdk");

const Cart = require("../models/cartModel");
const Users = require("../models/userModel");
const Orders = require("../models/orderModel");
const Products = require("../models/productModel");
const Newsletter = require("../models/newsletterModel");
const Categories = require("../models/categoryModel");
const Wishlists = require("../models/wishlistModel");
const HomePageContent = require("../models/homePageContentModel");

const handleUpload = require("../utils/uploadImage");
const { abandonedEmail } = require("../utils/sendEmail");
const { PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");

exports.updateHomePage = catchAsyncErrors(async (req, res, next) => {
  const { changeType, data } = req.body;

  const homePageContent = await HomePageContent.find();

  const imgFiles = req.files;

  const img1 = [];

  for (let i = 0; i < imgFiles.length; i++) {
    const file = imgFiles[i];
    const key = `Images/${file.fieldname}_${Date.now()}.jpg`;

    const params = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentDisposition: "inline",
      ContentType: "image/jpeg",
    });
    await S3Client.send(params);
    // const b64 = Buffer.from(file.buffer).toString("base64");
    // const dataURI = "data:" + file.mimetype + ";base64," + b64;
    // const cldRes = await handleUpload(dataURI);
    const icon = {
      id: key,
      link: `https://essentialsbyla.s3.ap-south-1.amazonaws.com/${key}`,
    };
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
              img:
                img1.filter((img) => img.sliderId === "firstBannerImg")[0]
                  ?.icon || homePageContent[0].firstBanner.img,
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
              img:
                img1.filter((img) => img.sliderId === "secondBannerImg")[0]
                  ?.icon || homePageContent[0].secondBanner.img,
            },
          },
        }
      );
      break;
    case "thirdBanner":
      await HomePageContent.updateOne(
        { _id: homePageContent[0]._id },
        {
          $set: {
            thirdBanner: {
              ...JSON.parse(data),
              img:
                img1.filter((img) => img.sliderId === "thirdBannerImg")[0]
                  ?.icon || homePageContent[0].thirdBanner.img,
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
  const newCollections = await Products.find({
    inStock: true,
  })
    .sort({ createdAt: -1 })
    .limit(8);
  const featuredProducts = await Products.find({
    _id: { $nin: newCollections.map((p1) => p1._id) },
    isFeatured: true,
    inStock: true,
  })
    .sort({ createdAt: -1 })
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

    const product = await Products.findOne({
      _id: wishlistProduct.productId,
      inStock: true,
    });

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

  const ServerEvent = bizSdk.ServerEvent;
  const EventRequest = bizSdk.EventRequest;
  const CustomData = bizSdk.CustomData;
  const UserData = bizSdk.UserData;

  const access_token = process.env.PIXEL_ACCESS_TOKEN;
  const pixel_id = process.env.PIXEL_ID;
  const api = bizSdk.FacebookAdsApi.init(access_token);

  let current_timestamp = Math.floor(new Date() / 1000);

  const userData_0 = new UserData()
    .setEmails([createHash("sha256").update(currentUser.email).digest("hex")])
    .setPhones([createHash("sha256").update(currentUser.phone).digest("hex")])
    .setDatesOfBirth([currentUser.birthDate])
    .setLastNames([
      createHash("sha256").update(currentUser.lname).digest("hex"),
    ])
    .setFirstNames([
      createHash("sha256").update(currentUser.fname).digest("hex"),
    ])
    .setClientIpAddress(req.headers["x-real-ip"])
    .setClientUserAgent(req.get("user-agent"))
    .setGenders([
      createHash("sha256")
        .update(currentUser.gender === "Male" ? "m" : "f")
        .digest("hex"),
    ])
    .setFbp(req.cookies["_fbp"])
    .setFbc(req.cookies["_fbc"]);

  const customData_0 = new CustomData()
    .setValue(
      (await Products.findOne({ _id: productId, inStock: true }))
        .combinations[0].salePrice
    )
    .setCurrency("INR")
    .setContentName(
      (await Products.findOne({ _id: productId, inStock: true })).name
    );

  const serverEvent_0 = new ServerEvent()
    .setEventName("AddToWishlist")
    .setEventTime(current_timestamp)
    .setUserData(userData_0)
    .setActionSource("website")
    .setEventId(crypto.randomUUID())
    .setCustomData(customData_0);

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
  return res.status(200).json({ success: true });
});

exports.sendAbandonedEmail = catchAsyncErrors(async (req, res, next) => {
  const { fname, lname, email, products, totalPrice } = req.body;

  await abandonedEmail(fname, lname, email, totalPrice, products);

  return res.status(200).json({ success: true });
});

exports.getAllCarts = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 5;

  const totalDocuments = await Cart.countDocuments();

  const carts = await Cart.find()
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort({ createdAt: -1 });

  const resData = [];
  for (let i = 0; i < carts.length; i++) {
    const userResData = [];
    const userCart = carts[i];

    const userInfo = await Users.findOne(
      { _id: userCart.uid },
      {
        birthDate: 0,
        createdAt: 0,
        gender: 0,
        password: 0,
        role: 0,
        usedCoupons: 0,
      }
    );
    for (let i = 0; i < userCart?.products.length; i++) {
      const cartProduct = userCart.products[i];

      const product = await Products.findOne({
        _id: cartProduct.productId,
        inStock: true,
      });

      userResData.push({
        ...product._doc,
        quantity: cartProduct.quantity,
        selectedVariantIds: cartProduct.selectedVariationIds,
        selectedCombination: cartProduct.selectedCombination,
      });
    }
    resData.push({
      ...userInfo._doc,
      ...userCart._doc,
      products: userResData,
    });
  }

  return res.status(200).json({
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + carts.length,
    carts: resData,
  });
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

    const product = await Products.findOne({
      _id: cartProduct.productId,
      inStock: true,
    });

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

  const shippingConfig = (
    await HomePageContent.findOne({}, { shippingConfig: 1 })
  ).shippingConfig;

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
      shippingPrice: shippingConfig?.minimumAmount
        ? shippingConfig.minimumAmount <
          selectedCombination.salePrice * quantity
          ? 0
          : shippingConfig.shippingCharge
        : shippingConfig?.shippingCharge,
    });

    await newCart.save();
    const ServerEvent = bizSdk.ServerEvent;
    const EventRequest = bizSdk.EventRequest;
    const CustomData = bizSdk.CustomData;
    const UserData = bizSdk.UserData;

    const access_token = process.env.PIXEL_ACCESS_TOKEN;
    const pixel_id = process.env.PIXEL_ID;
    const api = bizSdk.FacebookAdsApi.init(access_token);

    let current_timestamp = Math.floor(new Date() / 1000);

    const userData_0 = new UserData()
      .setEmails([createHash("sha256").update(currentUser.email).digest("hex")])
      .setPhones([createHash("sha256").update(currentUser.phone).digest("hex")])
      .setDatesOfBirth([currentUser.birthDate])
      .setLastNames([
        createHash("sha256").update(currentUser.lname).digest("hex"),
      ])
      .setFirstNames([
        createHash("sha256").update(currentUser.fname).digest("hex"),
      ])
      .setClientIpAddress(req.headers["x-real-ip"])
      .setClientUserAgent(req.get("user-agent"))
      .setGenders([
        createHash("sha256")
          .update(currentUser.gender === "Male" ? "m" : "f")
          .digest("hex"),
      ])
      .setFbp(req.cookies["_fbp"])
      .setFbc(req.cookies["_fbc"]);

    const customData_0 = new CustomData()
      .setValue(
        (await Products.findOne({ _id: productId, inStock: true }))
          .combinations[0].salePrice
      )
      .setCurrency("INR")
      .setContentName(
        (await Products.findOne({ _id: productId, inStock: true })).name
      );

    const serverEvent_0 = new ServerEvent()
      .setEventName("AddToCart")
      .setEventTime(current_timestamp)
      .setUserData(userData_0)
      .setActionSource("website")
      .setEventId(crypto.randomUUID())
      .setCustomData(customData_0);

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
    return res.status(200).json({ success: true });
  }

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
          shippingPrice: shippingConfig?.minimumAmount
            ? shippingConfig.minimumAmount < subTotalPrice
              ? 0
              : shippingConfig.shippingCharge
            : shippingConfig?.shippingCharge,
        },
      }
    );

    const ServerEvent = bizSdk.ServerEvent;
    const EventRequest = bizSdk.EventRequest;
    const CustomData = bizSdk.CustomData;
    const UserData = bizSdk.UserData;

    const access_token = process.env.PIXEL_ACCESS_TOKEN;
    const pixel_id = process.env.PIXEL_ID;
    const api = bizSdk.FacebookAdsApi.init(access_token);

    let current_timestamp = Math.floor(new Date() / 1000);

    const userData_0 = new UserData()
      .setEmails([createHash("sha256").update(currentUser.email).digest("hex")])
      .setPhones([createHash("sha256").update(currentUser.phone).digest("hex")])
      .setDatesOfBirth([currentUser.birthDate])
      .setLastNames([
        createHash("sha256").update(currentUser.lname).digest("hex"),
      ])
      .setFirstNames([
        createHash("sha256").update(currentUser.fname).digest("hex"),
      ])
      .setClientIpAddress(req.headers["x-real-ip"])
      .setClientUserAgent(req.get("user-agent"))
      .setGenders([
        createHash("sha256")
          .update(currentUser.gender === "Male" ? "m" : "f")
          .digest("hex"),
      ])
      .setFbp(req.cookies["_fbp"])
      .setFbc(req.cookies["_fbc"]);

    const customData_0 = new CustomData()
      .setValue(
        (await Products.findOne({ _id: productId, inStock: true }))
          .combinations[0].salePrice
      )
      .setCurrency("INR")
      .setContentName(
        (await Products.findOne({ _id: productId, inStock: true })).name
      );

    const serverEvent_0 = new ServerEvent()
      .setEventName("AddToCart")
      .setEventTime(current_timestamp)
      .setUserData(userData_0)
      .setActionSource("website")
      .setEventId(crypto.randomUUID())
      .setCustomData(customData_0);

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
    return res.status(200).json({ success: true });
  }

  await Cart.updateOne(
    { uid: currentUser._id },
    {
      $set: {
        products: updatedProducts,
        subTotalPrice,
        shippingPrice: shippingConfig?.minimumAmount
          ? shippingConfig.minimumAmount < subTotalPrice
            ? 0
            : shippingConfig.shippingCharge
          : shippingConfig?.shippingCharge,
      },
    }
  );

  const ServerEvent = bizSdk.ServerEvent;
  const EventRequest = bizSdk.EventRequest;
  const CustomData = bizSdk.CustomData;
  const UserData = bizSdk.UserData;

  const access_token = process.env.PIXEL_ACCESS_TOKEN;
  const pixel_id = process.env.PIXEL_ID;
  const api = bizSdk.FacebookAdsApi.init(access_token);

  let current_timestamp = Math.floor(new Date() / 1000);

  const userData_0 = new UserData()
    .setEmails([createHash("sha256").update(currentUser.email).digest("hex")])
    .setPhones([createHash("sha256").update(currentUser.phone).digest("hex")])
    .setDatesOfBirth([currentUser.birthDate])
    .setLastNames([
      createHash("sha256").update(currentUser.lname).digest("hex"),
    ])
    .setFirstNames([
      createHash("sha256").update(currentUser.fname).digest("hex"),
    ])
    .setClientIpAddress(req.headers["x-real-ip"])
    .setClientUserAgent(req.get("user-agent"))
    .setGenders([
      createHash("sha256")
        .update(currentUser.gender === "Male" ? "m" : "f")
        .digest("hex"),
    ])
    .setFbp(req.cookies["_fbp"])
    .setFbc(req.cookies["_fbc"]);

  const customData_0 = new CustomData()
    .setValue(
      (await Products.findOne({ _id: productId, inStock: true }))
        .combinations[0].salePrice
    )
    .setCurrency("INR")
    .setContentName(
      (await Products.findOne({ _id: productId, inStock: true })).name
    );

  const serverEvent_0 = new ServerEvent()
    .setEventName("AddToCart")
    .setEventTime(current_timestamp)
    .setUserData(userData_0)
    .setActionSource("website")
    .setEventId(crypto.randomUUID())
    .setCustomData(customData_0);

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
  return res.status(200).json({ success: true });
});

exports.deleteCart = catchAsyncErrors(async (req, res, next) => {
  const { productId, selectedCombination, quantity } = req.body;
  const currentUser = req.user;

  const cartItems = await Cart.findOne({ uid: currentUser._id });
  const shippingConfig = (
    await HomePageContent.findOne({}, { shippingConfig: 1 })
  ).shippingConfig;

  const subTotalPrice = cartItems?.products.some(
    (productC) =>
      productC.productId === productId &&
      productC.selectedCombination.id === selectedCombination.id
  )
    ? (cartItems?.subTotalPrice || 0) -
      selectedCombination.salePrice * quantity /*  -
              product.selectedCombination.salePrice */
    : (cartItems?.subTotalPrice || 0) +
      selectedCombination.salePrice * quantity;

  await Cart.updateOne(
    { uid: currentUser._id },
    {
      $pull: { products: { "selectedCombination.id": selectedCombination.id } },
      $set: {
        subTotalPrice,
        coupon: cartItems?.coupon.code
          ? cartItems?.coupon.minimumCartValue > subTotalPrice
            ? {}
            : cartItems?.coupon
          : cartItems?.coupon,
        discountedPrice: cartItems.coupon.code
          ? cartItems.coupon.minimumCartValue > subTotalPrice
            ? 0
            : cartItems.discountedPrice
          : cartItems.discountedPrice,
        shippingPrice: shippingConfig?.minimumAmount
          ? shippingConfig.minimumAmount < subTotalPrice
            ? 0
            : shippingConfig.shippingCharge
          : shippingConfig?.shippingCharge,
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
    const batchProducts = await Products.find({}, { _id: 1, inStock: true })
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

exports.updateShippingConfig = catchAsyncErrors(async (req, res, next) => {
  const { type, shippingConfig } = req.body;

  const homePageContent = await HomePageContent.findOne();

  const allCarts = await Cart.find();

  if (homePageContent) {
    await HomePageContent.updateOne(
      { _id: homePageContent._id },
      {
        $set: {
          shippingConfig:
            type === "free-delivery"
              ? { shippingCharge: 0 }
              : type === "free-condition"
              ? {
                  shippingCharge: +shippingConfig.shippingCharge,
                  minimumAmount: +shippingConfig.minimumAmount,
                }
              : { shippingCharge: +shippingConfig.shippingCharge },
        },
      }
    );

    for (let i = 0; i < allCarts.length; i++) {
      const cart = allCarts[i];

      await Cart.updateOne(
        { _id: cart._id },
        {
          $set: {
            shippingPrice:
              type === "free-condition"
                ? +shippingConfig.minimumAmount < cart.subTotalPrice
                  ? 0
                  : +shippingConfig.shippingCharge
                : +shippingConfig?.shippingCharge,
          },
        }
      );
    }

    return res.status(200).json({ success: true });
  }

  const newHomePage = new HomePageContent({
    shippingConfig:
      type === "free-delivery"
        ? { shippingCharge: 0 }
        : type === "free-condition"
        ? {
            shippingCharge: +shippingConfig.shippingCharge,
            minimumAmount: +shippingConfig.minimumAmount,
          }
        : { shippingCharge: +shippingConfig.shippingCharge },
  });

  await newHomePage.save();

  for (let i = 0; i < allCarts.length; i++) {
    const cart = allCarts[i];

    await Cart.updateOne(
      { _id: cart._id },
      {
        $set: {
          shippingPrice:
            type === "free-condition"
              ? +shippingConfig.minimumAmount < cart.subTotalPrice
                ? 0
                : +shippingConfig.shippingCharge
              : +shippingConfig?.shippingCharge,
        },
      }
    );
  }

  return res.status(200).json({ success: true });
});

exports.getFeatureProducts = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 12;

  const totalDocuments = await Products.countDocuments({ isFeatured: true });

  const products = await Products.find({ isFeatured: true, inStock: true })
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort({ createdAt: -1 });

  return res.status(200).json({
    products,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + products.length,
  });
});

exports.getDashboard = catchAsyncErrors(async (req, res, next) => {
  const d = new Date();

  const recentOrders = await Orders.find().sort({ paidAt: -1 }).limit(8);

  const todayOrders = await Orders.find({
    paidAt: { $gte: d.setHours(0, 0, 0, 0) },
  });

  let totalTodayOrdersVal = 0;
  let totalTodayOrdersCardVal = 0;
  let totalTodayOrdersUpiVal = 0;
  let totalTodayOrdersNetVal = 0;
  let totalTodayOrdersWalletVal = 0;

  for (let i = 0; i < todayOrders.length; i++) {
    const order = todayOrders[i];

    totalTodayOrdersVal =
      totalTodayOrdersVal +
      (order.subtotal + order.shippingPrice - order.discountedPrice);

    switch (order.method) {
      case "card":
        totalTodayOrdersCardVal =
          totalTodayOrdersCardVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "upi":
        totalTodayOrdersUpiVal =
          totalTodayOrdersUpiVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "netbanking":
        totalTodayOrdersNetVal =
          totalTodayOrdersNetVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "wallet":
        totalTodayOrdersWalletVal =
          totalTodayOrdersWalletVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      default:
        break;
    }
  }

  d.setDate(1);
  d.setHours(0);
  d.setMinutes(0);
  d.setSeconds(0);

  const thisMonthOrders = await Orders.find({
    paidAt: { $gte: d.getTime() },
  });

  let totalThisMonthOrdersVal = 0;
  let totalThisMonthOrdersCardVal = 0;
  let totalThisMonthOrdersUpiVal = 0;
  let totalThisMonthOrdersNetVal = 0;
  let totalThisMonthOrdersWalletVal = 0;

  for (let i = 0; i < thisMonthOrders.length; i++) {
    const order = thisMonthOrders[i];

    totalThisMonthOrdersVal =
      totalThisMonthOrdersVal +
      (order.subtotal + order.shippingPrice - order.discountedPrice);

    switch (order.method) {
      case "card":
        totalThisMonthOrdersCardVal =
          totalThisMonthOrdersCardVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "upi":
        totalThisMonthOrdersUpiVal =
          totalThisMonthOrdersUpiVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "netbanking":
        totalThisMonthOrdersNetVal =
          totalThisMonthOrdersNetVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "wallet":
        totalThisMonthOrdersWalletVal =
          totalThisMonthOrdersWalletVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      default:
        break;
    }
  }

  d.setMonth(d.getMonth() - 1);

  const lastMonthOrders = await Orders.find({
    paidAt: { $gte: d.getTime() },
  });

  let totalLastMonthOrdersVal = 0;
  let totalLastMonthOrdersCardVal = 0;
  let totalLastMonthOrdersUpiVal = 0;
  let totalLastMonthOrdersNetVal = 0;
  let totalLastMonthOrdersWalletVal = 0;

  for (let i = 0; i < lastMonthOrders.length; i++) {
    const order = lastMonthOrders[i];

    totalLastMonthOrdersVal =
      totalLastMonthOrdersVal +
      (order.subtotal + order.shippingPrice - order.discountedPrice);

    switch (order.method) {
      case "card":
        totalLastMonthOrdersCardVal =
          totalLastMonthOrdersCardVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "upi":
        totalLastMonthOrdersUpiVal =
          totalLastMonthOrdersUpiVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "netbanking":
        totalLastMonthOrdersNetVal =
          totalLastMonthOrdersNetVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "wallet":
        totalLastMonthOrdersWalletVal =
          totalLastMonthOrdersWalletVal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      default:
        break;
    }
  }

  let allTimeTotal = 0;
  let allTimeCardTotal = 0;
  let allTimeUpiTotal = 0;
  let allTimeNetTotal = 0;
  let allTimeWalletTotal = 0;

  let pendingOrders = 0;
  let processingOrders = 0;
  let shippedOrders = 0;
  let deliveryOrders = 0;

  const allOrders = await Orders.find();

  for (let i = 0; i < allOrders.length; i++) {
    const order = allOrders[i];

    allTimeTotal =
      allTimeTotal +
      (order.subtotal + order.shippingPrice - order.discountedPrice);

    switch (order.status[order.status.length - 1].name) {
      case "Pending":
        pendingOrders = pendingOrders + 1;
        break;

      case "Processing":
        processingOrders = processingOrders + 1;
        break;

      case "Shipped":
        shippedOrders = shippedOrders + 1;
        break;

      case "Delivered":
        deliveryOrders = deliveryOrders + 1;
        break;

      default:
        break;
    }

    switch (order.method) {
      case "card":
        allTimeCardTotal =
          allTimeCardTotal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "upi":
        allTimeUpiTotal =
          allTimeUpiTotal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "netbanking":
        allTimeNetTotal =
          allTimeNetTotal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      case "wallet":
        allTimeWalletTotal =
          allTimeWalletTotal +
          (order.subtotal + order.shippingPrice - order.discountedPrice);
        break;
      default:
        break;
    }
  }

  return res.status(200).json({
    todayOrders: {
      totalTodayOrdersVal,
      totalTodayOrdersCardVal,
      totalTodayOrdersUpiVal,
      totalTodayOrdersNetVal,
      totalTodayOrdersWalletVal,
    },
    thisMonthOrders: {
      totalThisMonthOrdersVal,
      totalThisMonthOrdersCardVal,
      totalThisMonthOrdersUpiVal,
      totalThisMonthOrdersNetVal,
      totalThisMonthOrdersWalletVal,
    },
    lastMonthOrders: {
      totalLastMonthOrdersVal,
      totalLastMonthOrdersCardVal,
      totalLastMonthOrdersUpiVal,
      totalLastMonthOrdersNetVal,
      totalLastMonthOrdersWalletVal,
    },
    allTime: {
      allTimeTotal,
      allTimeCardTotal,
      allTimeUpiTotal,
      allTimeNetTotal,
      allTimeWalletTotal,
    },
    ordersDetail: {
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveryOrders,
      totalOrders: allOrders.length,
    },
    recentOrders,
  });
});
