const Razorpay = require("razorpay");
const crypto = require("crypto");
const bizSdk = require("facebook-nodejs-business-sdk");
const { createHash } = require("crypto");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Notifications = require("../models/notificationModel");
const Products = require("../models/productModel");
const Coupons = require("../models/couponModel");
const Orders = require("../models/orderModel");
const Users = require("../models/userModel");
const Cart = require("../models/cartModel");

exports.createOrder = catchAsyncErrors(async (req, res) => {
  const currentUser = req.user;

  const cartItem = await Cart.findOne({ uid: currentUser._id });

  let isCoupon = false;

  if (cartItem.coupon) {
    isCoupon = await Coupons.findOne({
      code: cartItem.coupon.code,
      expiresAt: { $gt: Date.now() },
      minimumCartValue: { $lte: cartItem.subTotalPrice },
    });
  }

  const razorpayOrder = new Razorpay({
    key_id: process.env.RAZORPAY_KEYID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
  });

  const order = await razorpayOrder.orders.create({
    currency: "INR",
    amount: isCoupon
      ? cartItem.subTotalPrice * 100 +
        cartItem.shippingPrice * 100 -
        (cartItem.coupon.type === "fixed"
          ? cartItem.coupon.discount * 100
          : (cartItem.coupon.discount / 100) * cartItem.subTotalPrice * 100)
      : (cartItem.subTotalPrice + cartItem.shippingPrice) * 100,
    receipt: cartItem._id,
  });

  if (!order) {
    return res
      .status(500)
      .json({ message: "Transaction Failed", success: false });
  }

  return res.status(200).json({ orderId: order.id, success: true });
});

exports.authorizePayment = catchAsyncErrors(async (req, res, next) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    address,
  } = req.body;
  const currentUser = req.user;

  const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET_KEY);
  sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = sha.digest("hex");

  if (digest !== razorpay_signature) {
    return res
      .status(500)
      .json({ success: false, message: "Transaction is not valid" });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEYID,
    key_secret: process.env.RAZORPAY_SECRET_KEY,
  });

  const paymentInstance = await razorpay.payments.fetch(razorpay_payment_id);
  const cartItem = await Cart.findOne({ uid: currentUser._id });

  let isCoupon = false;
  const products = [];

  if (cartItem.coupon) {
    isCoupon = await Coupons.findOne({
      code: cartItem.coupon.code,
      expiresAt: { $gt: Date.now() },
      minimumCartValue: { $lte: cartItem.subTotalPrice },
    });
    if (isCoupon) {
      if (isCoupon.isOneTime) {
        if (
          !currentUser.usedCoupons?.some((usedCoupon) =>
            isCoupon._id.equals(usedCoupon)
          )
        ) {
          const discountedPrice =
            isCoupon.type === "fixed"
              ? isCoupon.discount
              : (isCoupon.discount / 100) * cartItem.subTotalPrice;

          if (isCoupon.type === "percentage") {
            if (isCoupon.maximumDiscount < discountedPrice) {
              isCoupon = false;
            }
          }
        } else {
          isCoupon = false;
        }
      } else {
        const discountedPrice =
          isCoupon.type === "fixed"
            ? isCoupon.discount
            : (isCoupon.discount / 100) * cartItem.subTotalPrice;

        if (isCoupon.type === "percentage") {
          if (isCoupon.maximumDiscount < discountedPrice) {
            isCoupon = false;
          }
        }
      }
    }
  }

  for (let i = 0; i < cartItem.products.length; i++) {
    const cartProduct = cartItem.products[i];

    const cartProducts = await Products.findOne({
      _id: cartProduct.productId,
      inStock: true,
    });

    products.push({
      ...cartProducts._doc,
      ...cartProduct._doc,
    });
  }

  const newOrder = new Orders({
    uid: currentUser._id,
    status: [
      {
        name: "Pending",
        message: "Your order has been received",
        changedAt: Date.now(),
      },
    ],
    address,
    coupon: isCoupon ? cartItem.coupon : {},
    discountedPrice: isCoupon
      ? cartItem.coupon.type === "fixed"
        ? cartItem.coupon.discount
        : (cartItem.coupon.discount / 100) * cartItem.subTotalPrice
      : 0,
    products,
    shippingPrice: cartItem.shippingPrice,
    subtotal:
      cartItem.subTotalPrice -
      (isCoupon
        ? cartItem.coupon.type === "fixed"
          ? cartItem.coupon.discount
          : (cartItem.coupon.discount / 100) * cartItem.subTotalPrice
        : 0),
    method: paymentInstance.method,
  });

  await newOrder.save();

  await Cart.deleteOne({ uid: currentUser._id });

  const newNotification = new Notifications({
    orderTotal:
      cartItem.subTotalPrice -
      (isCoupon
        ? cartItem.coupon.type === "fixed"
          ? cartItem.coupon.discount
          : (cartItem.coupon.discount / 100) * cartItem.subTotalPrice
        : 0),
    type: "order",
    username: `${currentUser.fname} ${currentUser.lname}`,
    orderId: newOrder._id,
  });

  await newNotification.save();

  if (isCoupon) {
    await Users.updateOne(
      { _id: currentUser._id },
      { $push: { usedCoupons: isCoupon._id } }
    );
  }

  const ServerEvent = bizSdk.ServerEvent;
  const EventRequest = bizSdk.EventRequest;
  const UserData = bizSdk.UserData;
  const CustomData = bizSdk.CustomData;
  const Content = bizSdk.Content;

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
    .setGenders([
      createHash("sha256")
        .update(currentUser.gender === "Male" ? "m" : "f")
        .digest("hex"),
    ])
    .setCities([createHash("sha256").update(address.city).digest("hex")])
    .setZips([createHash("sha256").update(address.zipCode).digest("hex")])
    .setCountries([createHash("sha256").update(address.country).digest("hex")])
    .setClientIpAddress(req.headers["x-real-ip"])
    .setClientUserAgent(req.get("user-agent"))
    .setFbp(req.cookies["_fbp"])
    .setFbc(req.cookies["_fbc"]);

  const customData_0 = new CustomData()
    .setValue(
      await (cartItem.subTotalPrice -
        (isCoupon
          ? cartItem.coupon.type === "fixed"
            ? cartItem.coupon.discount
            : (cartItem.coupon.discount / 100) * cartItem.subTotalPrice
          : 0))
    )
    .setCurrency("INR");

  const serverEvent_0 = new ServerEvent()
    .setEventName("Purchase")
    .setEventTime(current_timestamp)
    .setUserData(userData_0)
    .setCustomData(customData_0)
    .setActionSource("website")
    .setEventId(crypto.randomUUID())
    .setEventSourceUrl("https://www.essentialsbyla.com/cart");

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
