const express = require("express");
const cors = require("cors");
const Multer = require("multer");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  addUpdateCoupon,
  getCoupons,
  deleteCoupon,
  checkCode,
} = require("../controllers/couponController");

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
});

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/coupon").post(isAuthenticate, authorizeRoles("admin"), upload.any(), addUpdateCoupon);
router.route("/coupons").get(isAuthenticate, authorizeRoles("admin"), getCoupons);
router.route("/remove-coupon").post(isAuthenticate, authorizeRoles("admin"), deleteCoupon);
router.route("/check-code").post(isAuthenticate, checkCode);

module.exports = router;
