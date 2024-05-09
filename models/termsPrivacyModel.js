const mongoose = require("mongoose");

const termsPrivacyContentSchema = new mongoose.Schema({
  termsConditions: {
    type: String,
  },
  privacyPolicy: {
    type: String,
  },
  refundPolicy: {
    type: String,
  },
  shippingPolicy: {
    type: String,
  },
});

module.exports = mongoose.model(
  "TermsPrivacyContent",
  termsPrivacyContentSchema
);
