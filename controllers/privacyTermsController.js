const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const TermsPrivacy = require("../models/termsPrivacyModel");

exports.getPrivacyTerms = catchAsyncErrors(async (req, res, next) => {
  return res.status(200).json(await TermsPrivacy.findOne());
});

exports.updatePrivacyTerms = catchAsyncErrors(async (req, res, next) => {
  const { privacyPolicy, termsConditions, refundPolicy, shippingPolicy } =
    req.body;

  const isAvailable = await TermsPrivacy.findOne();

  if (isAvailable) {
    await TermsPrivacy.updateOne(
      { _id: isAvailable._id },
      { $set: { privacyPolicy, termsConditions, refundPolicy, shippingPolicy } }
    );
  } else {
    const newPrivacyTerms = new TermsPrivacy({
      privacyPolicy,
      termsConditions,
      refundPolicy,
      shippingPolicy,
    });

    await newPrivacyTerms.save();
  }

  return res.status(200).json({ success: true });
});
