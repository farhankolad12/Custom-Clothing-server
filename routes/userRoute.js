const express = require("express");
const cors = require("cors");

const { register, login, logout } = require("../controllers/userController");
const { isAuthenticate } = require("../middlewares/auth");

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").post(isAuthenticate, logout);
router
  .route("/check-auth")
  .get(isAuthenticate, (req, res) => res.status(200).json({ user: req.user }));

module.exports = router;
