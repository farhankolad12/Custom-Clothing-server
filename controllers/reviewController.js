const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Orders = require("../models/orderModel");
const Reviews = require("../models/reviewModel");

exports.createUserReviews = catchAsyncErrors(async (req, res, next) => {
  const { reviews } = req.body;

  const isReview = await Reviews.findOne({ orderId: reviews[0].orderId });

  if (isReview) {
    return res.status(200).json({ success: true });
  }

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];

    const newReview = new Reviews({
      uid: req.user._id,
      ...review,
    });

    await newReview.save();
  }

  return res.status(200).json({ success: true });
});
