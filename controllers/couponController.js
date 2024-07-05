const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");

const Cart = require("../models/cartModel");
const Coupons = require("../models/couponModel");

const filterQuery = require("../utils/filterQuery");
const handleUpload = require("../utils/uploadImage");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

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
    usagePerCustomer,
    description,
    maximumDiscount,
  } = req.body;

  const isOneTime = usagePerCustomer === "one-time";

  const isExists = await Coupons.findOne({ _id: _id });

  const file = req.files[0];

  let img = JSON.parse(image || "{}");

  if (file) {
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
    img = {
      id: key,
      link: `https://essentialsbyla.s3.ap-south-1.amazonaws.com/${key}`,
    };
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
          description,
          isOneTime,
          maximumDiscount: type === "percentage" ? maximumDiscount : undefined,
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
    description,
    isOneTime,
    maximumDiscount: type === "percentage" ? maximumDiscount : undefined,
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
    if (
      isExists.isOneTime &&
      currentUser.usedCoupons?.some((usedCoupon) =>
        isExists._id.equals(usedCoupon)
      )
    ) {
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
        .json({ success: false, message: "Coupon already used" });
    }
    const discountedPrice =
      isExists.type === "fixed"
        ? isExists.discount
        : (isExists.discount / 100) * cartItem.subTotalPrice;

    if (isExists.type === "percentage") {
      if (isExists.maximumDiscount < discountedPrice) {
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
      }
    }

    await Cart.updateOne(
      { uid: currentUser._id },
      {
        $set: {
          coupon: isExists,
          discountedPrice,
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
});
