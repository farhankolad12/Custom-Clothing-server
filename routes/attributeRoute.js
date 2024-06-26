const express = require("express");
const cors = require("cors");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
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
  })
);

router.route("/attributes").post(isAuthenticate, authorizeRoles("admin"), addAttributes);
router.route("/attributes").get(isAuthenticate, authorizeRoles("admin"), getAttributes);
router.route("/remove-attribute").post(isAuthenticate, authorizeRoles("admin"), deleteAttribute);

module.exports = router;
