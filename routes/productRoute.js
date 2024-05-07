const express = require("express");
const cors = require("cors");
const Multer = require("multer");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  getProductFilters,
  addProduct,
  getProducts,
  deleteProduct,
  getProduct,
} = require("../controllers/productController");

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

router.route("/product-filters").get(getProductFilters);

router.route("/product").post(isAuthenticate, authorizeRoles("admin"), upload.any(), addProduct);

router.route("/product").get(getProduct);

router.route("/remove-product").post(isAuthenticate,authorizeRoles("admin"), deleteProduct);

router.route("/products").get(isAuthenticate, authorizeRoles("admin"), getProducts);

module.exports = router;
