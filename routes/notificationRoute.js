const express = require("express");
const cors = require("cors");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  getNotifications,
  readNotification,
  deleteNotification,
} = require("../controllers/notificationController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router
  .route("/notifications")
  .get(isAuthenticate, authorizeRoles("admin"), getNotifications);

router
  .route("/read-notification")
  .post(isAuthenticate, authorizeRoles("admin"), readNotification);

router
  .route("/delete-notification")
  .post(isAuthenticate, authorizeRoles("admin"), deleteNotification);

module.exports = router;
