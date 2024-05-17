const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const Notifications = require("../models/notificationModel");

exports.getNotifications = catchAsyncErrors(async (req, res, next) => {
  return res
    .status(200)
    .json(await Notifications.find().sort({ createdAt: -1 }));
});

exports.readNotification = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.body;

  await Notifications.updateOne({ _id: id }, { $set: { isRead: true } });

  return res.status(200).json({ success: true });
});

exports.deleteNotification = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.body;

  await Notifications.deleteOne({ _id: id });

  return res.status(200).json({ success: true });
});
