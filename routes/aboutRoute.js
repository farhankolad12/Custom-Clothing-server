const express = require("express");
const cors = require("cors");
const Multer = require("multer");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  updateAboutPage,
  getAboutPage,
} = require("../controllers/aboutController");

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
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

router
  .route("/about-page")
  .post(isAuthenticate, authorizeRoles("admin"), upload.any(), updateAboutPage);

router.route("/about-page").get(getAboutPage);

module.exports = router;
