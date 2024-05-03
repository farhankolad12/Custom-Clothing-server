const express = require("express");
const cors = require("cors");

const { isAuthenticate } = require("../middlewares/auth");
const { shopPage, filterProducts } = require("../controllers/shopController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],

    credentials: true,
  })
);

router.route("/shop-page").get(shopPage);

router.route("/filter-products").get(filterProducts);

module.exports = router;
