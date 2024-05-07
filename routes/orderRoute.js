const express = require("express");
const cors = require("cors");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  getOrders,
  getOrder,
  updateStatus,
  getUserOrders,
  getUserOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/orders").get(isAuthenticate, authorizeRoles("admin"), getOrders);

router.route("/order").get(isAuthenticate, authorizeRoles("admin"), getOrder);

router.route("/user-orders").get(isAuthenticate, getUserOrders);

router.route("/user-order").get(isAuthenticate, getUserOrder);

router.route("/update-status").post(isAuthenticate, authorizeRoles("admin"), updateStatus);

module.exports = router;
