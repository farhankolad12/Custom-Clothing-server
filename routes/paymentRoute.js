const express = require("express");
const cors = require("cors");

const { isAuthenticate } = require("../middlewares/auth");
const {
  createOrder,
  authorizePayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/order").post(isAuthenticate, createOrder);

router.route("/authorize").post(isAuthenticate, authorizePayment);

module.exports = router;
