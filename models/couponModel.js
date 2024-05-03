const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  image: {
    id: { type: String },
    link: { type: String },
  },
  name: { type: String },
  code: { type: String },
  expiresAt: { type: Number },
  type: { type: String },
  discount: { type: Number },
  minimumCartValue: { type: Number },
  createdAt: {
    type: Number,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Coupons", couponSchema);
