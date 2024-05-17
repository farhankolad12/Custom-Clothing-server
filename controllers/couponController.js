const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");

const Cart = require("../models/cartModel");
const Coupons = require("../models/couponModel");

const filterQuery = require("../utils/filterQuery");
const handleUpload = require("../utils/uploadImage");

exports.addUpdateCoupon = catchAsyncErrors(async (req, res, next) => {
  const {
    image,
    name,
    code,
    expiresAt,
    type,
    discount,
    minimumCartValue,
    _id,
  } = req.body;

  const isExists = await Coupons.findOne({ _id: _id });

  const file = req.files[0];

  let img = JSON.parse(image || "{}");

  if (file) {
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    img = { id: cldRes.public_id, link: cldRes.url };
  }

  if (isExists) {
    await Coupons.updateOne(
      { _id: _id },
      {
        $set: {
          image: img,
          name,
          code,
          expiresAt: new Date(expiresAt).getTime(),
          type,
          discount,
          minimumCartValue,
        },
      }
    );

    const updateCoupon = await Coupons.findOne({ _id: _id });

    return res.status(200).json({ success: true, coupon: updateCoupon });
  }

  const newCoupon = new Coupons({
    image: img,
    name,
    code,
    expiresAt: new Date(expiresAt).getTime(),
    type,
    discount,
    minimumCartValue,
  });

  await newCoupon.save();

  return res.status(200).json({ success: true, coupon: newCoupon });
});

exports.getCoupons = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const sort = params.get("sort");

  const {
    data: coupons,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  } = await filterQuery(searchParams, ["name"], Coupons, sort, "and");

  return res.status(200).json({
    coupons,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  });
});

exports.deleteCoupon = catchAsyncErrors(async (req, res, next) => {
  const { couponId } = req.body;

  await Coupons.deleteOne({ _id: couponId });

  return res.status(200).json({ success: true });
});

exports.checkCode = catchAsyncErrors(async (req, res, next) => {
  const { code } = req.body;
  const currentUser = req.user;

  const cartItem = await Cart.findOne({ uid: currentUser._id });

  const isExists = await Coupons.findOne({
    code,
    expiresAt: { $gt: Date.now() },
    minimumCartValue: { $lte: cartItem?.subTotalPrice },
  });

  if (isExists) {
    await Cart.updateOne(
      { uid: currentUser._id },
      {
        $set: {
          coupon: isExists,
          discountedPrice:
            isExists.type === "fixed"
              ? isExists.discount
              : (isExists.discount / 100) * cartItem.subTotalPrice,
        },
      }
    );
    return res.status(200).json({ coupon: isExists, success: true });
  }

  await Cart.updateOne(
    { uid: currentUser._id },
    {
      $set: {
        coupon: {},
        discountedPrice: 0,
      },
    }
  );

  return res
    .status(200)
    .json({ success: false, message: "Invalid coupon code" });
  // return next(new ErrorHandler("Invalid coupon code", 401));
});
