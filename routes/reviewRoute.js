const express = require("express");
const cors = require("cors");

const { isAuthenticate } = require("../middlewares/auth");
const { createUserReviews } = require("../controllers/reviewController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,

    credentials: true,
  })
);

router.route("/reviews").post(isAuthenticate, createUserReviews);

module.exports = router;
