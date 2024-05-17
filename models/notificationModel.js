const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  type: {
    type: String,
  },
  orderTotal: {
    type: Number,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Number,
    default: Date.now(),
  },
  orderId: {
    type: String,
  },
});

module.exports = mongoose.model("Notifications", notificationSchema);
