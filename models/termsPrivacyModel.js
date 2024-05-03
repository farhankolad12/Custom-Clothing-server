const mongoose = require("mongoose");

const termsPrivacyContentSchema = new mongoose.Schema({
  termsConditions: {
    type: String,
  },
  privacyPolicy: {
    type: String,
  },
});

module.exports = mongoose.model(
  "TermsPrivacyContent",
  termsPrivacyContentSchema
);
