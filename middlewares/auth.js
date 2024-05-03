const ErrorHandler = require("../utils/errorhandler");

const jwt = require("jsonwebtoken");

const Users = require("../models/userModel");

exports.isAuthenticate = async (req, res, next) => {
  const { isAdmin } = req.query;

  const token = Boolean(isAdmin) ? req.cookies.adminToken : req.cookies.token;

  if (!token) {
    return next(new ErrorHandler("Please Login", 401, res));
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

    return next(new ErrorHandler("Please Login", 401, res));
  } catch (err) {
    console.log(err);
    res.clearCookie(Boolean(isAdmin) ? "adminToken" : "token");

    return next(new ErrorHandler("Please Login", 401, res));
  }
};

exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        ErrorHandler(
          `Role: ${req.user.role} is not allowed to access this resouce `,
          403,
          res
        )
      );
    }

    next();
  };
};
