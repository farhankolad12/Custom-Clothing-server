const express = require("express");
const cors = require("cors");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  getPrivacyTerms,
  updatePrivacyTerms,
} = require("../controllers/privacyTermsController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    preflightContinue: true,
    allowedHeaders: ["Content-Type", "Authorization"],

    credentials: true,
  })
);

router.route("/privacy-terms-page").get(getPrivacyTerms);

router
  .route("/privacy-terms-page")
  .post(isAuthenticate, authorizeRoles("admin"), updatePrivacyTerms);

module.exports = router;
