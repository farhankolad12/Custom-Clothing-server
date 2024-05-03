const express = require("express");
const cors = require("cors");

const { addQueries } = require("../controllers/queriesController");

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

router.route("/queries").post(addQueries);

module.exports = router;
