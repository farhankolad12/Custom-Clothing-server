const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  shortDescription: {
    type: String,
  },
  fullDescription: {
    type: String,
  },
  price: {
    type: Number,
  },
  isFeatured: {
    type: Boolean,
  },
  category: {
    type: String,
  },
  tags: [
    {
      id: { type: String },
      tag: { type: String },
    },
  ],
  variants: [
    {
      displayName: { type: String },
      title: { type: String },
      values: [
        {
          id: { type: String },
          variant: { type: String },
        },
      ],
    },
  ],
  combinations: [
    {
      id: { type: String },
      price: { type: Number },
      salePrice: { type: Number },
      combinations: [
        {
          id: { type: String },
          variant: { type: String },
          parentName: { type: String },
        },
      ],
    },
  ],
  images: [
    {
      id: {
        type: String,
      },
      link: {
        type: String,
      },
    },
  ],
  createdAt: {
    type: Number,
    default: Date.now(),
  },
  inStock: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Products", productSchema);
