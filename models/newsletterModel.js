const mongoose = require("mongoose");

const newsletterSchema = new mongoose.Schema({
  email: { type: String },
  newsletterSend: { type: Boolean, default: false },
  subscribedAt: {
    type: Number,
    default: Date.now,
  },
});

module.exports = mongoose.model("Newsletter", newsletterSchema);
