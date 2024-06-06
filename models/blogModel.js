const mongoose = require("mongoose");

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  shortDescription: {
    type: String,
  },
  fullDescription: {
    type: String,
  },
  category: {
    type: String,
  },
  image: {
    id: {
      type: String,
    },
    link: {
      type: String,
    },
  },
  tags: [
    {
      id: String,
      tag: String,
    },
  ],
  createdAt: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model("Blogs", blogSchema);
