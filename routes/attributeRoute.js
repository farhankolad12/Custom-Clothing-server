const express = require("express");
const cors = require("cors");

const { isAuthenticate } = require("../middlewares/auth");
const {
  addAttributes,
  getAttributes,
  deleteAttribute,
} = require("../controllers/attributeController");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

router.route("/attributes").post(isAuthenticate, addAttributes);
router.route("/attributes").get(isAuthenticate, getAttributes);
router.route("/remove-attribute").post(isAuthenticate, deleteAttribute);

module.exports = router;
