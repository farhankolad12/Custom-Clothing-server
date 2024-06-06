const mongoose = require("mongoose");

const querySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
  },
  message: {
    type: String,
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model("Queries", querySchema);
