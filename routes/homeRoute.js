const express = require("express");
const cors = require("cors");
const Multer = require("multer");

const {
  homePage,
  getCart,
  updateCart,
  updateWishlist,
  getWishlists,
  deleteWishlist,
  deleteCart,
  updateHomePage,
  updateNewsletter,
  getProductsSitemap,
  updateShippingConfig,
  getFeatureProducts,
  getDashboard,
} = require("../controllers/homeController");
const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const { updateLogo } = require("../controllers/updateLogo");

const router = express.Router();

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
});

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/home-page").get(homePage);

router
  .route("/dashboard")
  .get(isAuthenticate, authorizeRoles("admin"), getDashboard);

router
  .route("/home-page")
  .post(isAuthenticate, authorizeRoles("admin"), upload.any(), updateHomePage);

router.route("/feature-products").get(getFeatureProducts);

router
  .route("/update-logo")
  .post(isAuthenticate, authorizeRoles("admin"), upload.any(), updateLogo);

router
  .route("/shipping-config")
  .post(isAuthenticate, authorizeRoles("admin"), updateShippingConfig);

router.route("/update-cart").post(isAuthenticate, updateCart);

router.route("/get-cart").get(isAuthenticate, getCart);

router.route("/delete-cart").post(isAuthenticate, deleteCart);

router.route("/update-wishlist").post(isAuthenticate, updateWishlist);

router.route("/wishlists").get(isAuthenticate, getWishlists);

router.route("/delete-wishlist").post(isAuthenticate, deleteWishlist);

router.route("/newsletter").post(updateNewsletter);

router.route("/products-sitemap").get(getProductsSitemap);

module.exports = router;
