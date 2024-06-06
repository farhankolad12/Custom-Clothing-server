const mongoose = require("mongoose");
const ResetTokensSchema = new mongoose.Schema({
  userId: { type: String },
  token: { type: String },
  expiredAt: { type: Number, default: Date.now + 86400 },
});

module.exports = mongoose.model("ResetTokens", ResetTokensSchema);
