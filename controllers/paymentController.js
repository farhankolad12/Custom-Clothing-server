const Razorpay = require("razorpay");
const crypto = require("crypto");

const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Notifications = require("../models/notificationModel");
const Products = require("../models/productModel");
const Coupons = require("../models/couponModel");
const Orders = require("../models/orderModel");
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

  // console.log(order);

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
  }

  for (let i = 0; i < cartItem.products.length; i++) {
    const cartProduct = cartItem.products[i];

    const cartProducts = await Products.findOne({
      _id: cartProduct.productId,
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

  return res.status(200).json({ success: true });
});
