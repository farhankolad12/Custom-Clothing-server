const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  icon: {
    id: {
      type: String,
    },
    link: {
      type: String,
    },
  },
  bannerImg: {
    id: {
      type: String,
    },
    link: {
      type: String,
    },
  },
  tags: [
    {
      id: { type: String },
      tag: { type: String },
    },
  ],
  createdAt: {
    type: Number,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Categories", categorySchema);
