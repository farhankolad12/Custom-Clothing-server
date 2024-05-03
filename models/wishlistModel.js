const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  uid: { type: String },
  products: [
    {
      productId: { type: String },
    },
  ],
  createdAt: {
    type: Number,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Wishlists", wishlistSchema);
