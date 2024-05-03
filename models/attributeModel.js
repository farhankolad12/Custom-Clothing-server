const mongoose = require("mongoose");

const attributeSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  displayName: {
    type: String,
  },
  type: {
    type: String,
  },
  options: [
    {
      id: { type: String },
      variant: { type: String },
    },
  ],
  createdAt: {
    type: Number,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Attributes", attributeSchema);
