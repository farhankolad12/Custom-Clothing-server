const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const { createHash } = require("crypto");
const bizSdk = require("facebook-nodejs-business-sdk");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Cart = require("../models/cartModel");
const Users = require("../models/userModel");
const Orders = require("../models/orderModel");
const Products = require("../models/productModel");
const ResetTokens = require("../models/resetTokenModel");

const sendToken = require("../utils/sendToken");
const filterQuery = require("../utils/filterQuery");
const { sendResetMail } = require("../utils/sendEmail");

exports.register = catchAsyncErrors(async (req, res, next) => {
  const {
    fname,
    lname,
    phone,
    birthDate,
    gender,
    email,
    pass,
    editing,
    _id,
    currPass,
    newPass,
  } = req.body;

  if (editing) {
    const user = await Users.findOne({ _id: _id });

    if (currPass) {
      if (await bcrypt.compare(currPass, user.password)) {
        await Users.updateOne(
          { _id: _id },
          {
            $set: {
              fname,
              lname,
              email,
              phone,
              password: await bcrypt.hash(newPass, 10),
            },
          }
        );
      } else {
        return res
          .status(401)
          .json({ success: false, message: "Current password is invalid!" });
      }

      return res.status(200).json({ success: true });
    }

    await Users.updateOne(
      { _id: _id },
      {
        $set: {
          fname,
          lname,
          email,
          phone,
        },
      }
    );

    return res.status(200).json({ success: true });
  }

  const emailExists = await Users.findOne({ email });

  if (emailExists) {
    return res
      .status(401)
      .json({ success: false, message: "Email Already Exists" });
  }

  const hashPassword = await bcrypt.hash(pass, 10);

  const user = await Users.create({
    fname,
    lname,
    phone,
    birthDate,
    email,
    gender,
    password: hashPassword,
  });

  const ServerEvent = bizSdk.ServerEvent;
  const EventRequest = bizSdk.EventRequest;
  const UserData = bizSdk.UserData;

  const access_token = process.env.PIXEL_ACCESS_TOKEN;
  const pixel_id = process.env.PIXEL_ID;
  const api = bizSdk.FacebookAdsApi.init(access_token);

  let current_timestamp = Math.floor(new Date() / 1000);

  const userData_0 = new UserData()
    .setEmails([createHash("sha256").update(email).digest("hex")])
    .setPhones([createHash("sha256").update(phone).digest("hex")])
    .setDatesOfBirth([birthDate])
    .setLastNames([createHash("sha256").update(lname).digest("hex")])
    .setFirstNames([createHash("sha256").update(fname).digest("hex")])
    .setClientIpAddress(req.headers["x-real-ip"])
    .setClientUserAgent(req.get("user-agent"))
    .setGenders([
      createHash("sha256")
        .update(gender === "Male" ? "m" : "f")
        .digest("hex"),
    ])
    .setFbp(req.cookies["_fbp"])
    .setFbc(req.cookies["_fbc"]);

  const serverEvent_0 = new ServerEvent()
    .setEventName("CompleteRegistration")
    .setEventTime(current_timestamp)
    .setUserData(userData_0)
    .setActionSource("website")
    .setEventId(crypto.randomUUID())
    .setEventSourceUrl("https://www.essentialsbyla.com/signup");

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

  sendToken({ user, cartItems: [] }, 200, res);
});

exports.login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, remember, isAdmin } = req.body;

  if (isAdmin) {
    const user = await Users.findOne({ email, role: "admin" });

    if (user && (await bcrypt.compare(password, user.password))) {
      return sendToken({ user, cartItems: [] }, 200, res);
    }

    return res
      .status(401)
      .json({ success: false, message: "Email/password is incorrect" });
  }

  const user = await Users.findOne({ email, role: "customer" });

  if (user && (await bcrypt.compare(password, user.password))) {
    const userCart = await Cart.findOne({ uid: user._id });

    // if (!userCart) {
    //   return res.status(200).json({ products: [] });
    // }

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
    return sendToken(
      { user, cartItems: { ...userCart?._doc, products: resData || [] } },
      200,
      res
    );
  }

  return res
    .status(401)
    .json({ success: false, message: "Email/password is incorrect" });
});

exports.logout = catchAsyncErrors(async (req, res, next) => {
  return res
    .status(200)
    .cookie(req.user.role === "customer" ? "token" : "adminToken", "", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json({ success: true });
});

exports.forgetPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;

  const user = await Users.findOne(
    { email, role: "customer" },
    { email: 1, fname: 1, _id: 1 }
  );

  if (user) {
    const alreadyReqReset = await ResetTokens.findOne({ userId: user._id });

    if (alreadyReqReset) {
      await sendResetMail({
        to: email,
        name: user.fname,
        token: alreadyReqReset.token,
      });
    } else {
      const token = jwt.sign(user._doc, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });

      await sendResetMail({ to: email, name: user.fname, token });

      const resetToken = new ResetTokens({
        token,
      });

      await resetToken.save();
    }
  }

  return res.status(200).json({ success: true });
});

exports.getCustomers = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const sort = params.get("sort");

  const {
    data: customers,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  } = await filterQuery(
    searchParams,
    ["fname", "lname", "email", "phone", "gender"],
    Users,
    sort,
    "or"
  );

  return res.status(200).json({
    customers,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  });
});

exports.getAdminUserOrders = catchAsyncErrors(async (req, res, next) => {
  const { searchParams, id } = req.query;

  const params = new URLSearchParams(searchParams);

  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 5;
  const totalDocuments = await Orders.countDocuments({ uid: id });

  const orders = await Orders.find({ uid: id })
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1));

  return res.status(200).json({
    orders,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + orders.length,
  });
});

exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
  const { token, password } = req.body;

  const isExistsToken = await ResetTokens.findOne({
    token,
    expiredAt: { $gt: Date.now() },
  });

  console.log(isExistsToken);

  if (isExistsToken) {
    const data = jwt.verify(token, process.env.JWT_SECRET);

    const userId = data._id;

    const user = await Users.findOne({ _id: userId });

    console.log(user);
    if (user) {
      const newPassEnc = await bcrypt.hash(password, 10);

      await Users.updateOne(
        { _id: userId },
        { $set: { password: newPassEnc } }
      );

      await ResetTokens.deleteOne({ token });

      return res.status(200).json({ success: true });
    } else {
      return res.status(401).json({ success: false, message: "Invalid Token" });
    }
  }

  return res.status(401).json({ success: false, message: "Invalid Token" });
});
