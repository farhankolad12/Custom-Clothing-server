const jwt = require("jsonwebtoken");

const Users = require("../models/userModel");

exports.isAuthenticate = async (req, res, next) => {
  const { isAdmin } = req.query;

  const token = Boolean(isAdmin) ? req.cookies.adminToken : req.cookies.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Please Login" });
  }

  try {
    const decodedData = jwt.verify(token, process.env.JWT_SECRET);

    const user = await Users.findOne(
      { _id: decodedData.id, role: Boolean(isAdmin) ? "admin" : "customer" },
      { password: 0 }
    );

    if (user) {
      req.user = user;
      return next();
    }

    return res.status(401).json({ success: false, message: "Please Login" });
  } catch (err) {
    console.log(err);
    res
      .cookie(Boolean(isAdmin) ? "adminToken" : "token", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
      .status(401)
      .json({ success: false, message: "Please login again!" });
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      res.cookie("adminToken", "", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      return res.status(403).json({
        success: false,
        message: `Role: ${req.user.role} is not allowed to access this resouce `,
      });
    }

    next();
  };
};
