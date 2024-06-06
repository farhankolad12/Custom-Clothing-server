const mongoose = require("mongoose");

const review = new mongoose.Schema({
  id: {
    type: String,
  },
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  username: {
    type: String,
  },
  message: {
    type: String,
  },
  uid: {
    type: String,
  },
  orderId: {
    type: String,
  },
  productId: {
    type: String,
  },
  rating: {
    type: Number,
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model("Reviews", review);
