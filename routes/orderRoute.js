const express = require("express");
const cors = require("cors");

const { isAuthenticate } = require("../middlewares/auth");
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
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    preflightContinue: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

router.route("/orders").get(isAuthenticate, getOrders);

router.route("/order").get(isAuthenticate, getOrder);

router.route("/user-orders").get(isAuthenticate, getUserOrders);

router.route("/user-order").get(isAuthenticate, getUserOrder);

router.route("/update-status").post(isAuthenticate, updateStatus);

module.exports = router;
