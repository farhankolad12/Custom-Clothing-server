const express = require("express");
const cors = require("cors");

const { addQueries } = require("../controllers/queriesController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/queries").post(addQueries);

module.exports = router;
