const mongoose = require("mongoose");

function dateNow() {
  return Date.now() + 86400
}

const ResetTokensSchema = new mongoose.Schema({
  userId: { type: String },
  token: { type: String },
  expiredAt: { type: Number, default: dateNow },
});

module.exports = mongoose.model("ResetTokens", ResetTokensSchema);
