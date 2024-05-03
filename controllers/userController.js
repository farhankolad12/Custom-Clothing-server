const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const ErrorHandler = require("../utils/errorhandler");

const bcrypt = require("bcrypt");

const Users = require("../models/userModel");
const sendToken = require("../utils/sendToken");

exports.register = catchAsyncErrors(async (req, res, next) => {
  const {
    fname,
    lname,
    phone,
    birthDate,
    gender,
    email,
    pass,
    editing,
    _id,
    currPass,
    newPass,
  } = req.body;

  if (editing) {
    const user = await Users.findOne({ _id: _id });

    if (currPass) {
      if (await bcrypt.compare(currPass, user.password)) {
        await Users.updateOne(
          { _id: _id },
          {
            $set: {
              fname,
              lname,
              email,
              phone,
              password: await bcrypt.hash(newPass, 10),
            },
          }
        );
      } else {
        return next(new ErrorHandler("Current password is invalid!"));
      }

      return res.status(200).json({ success: true });
    }

    await Users.updateOne(
      { _id: _id },
      {
        $set: {
          fname,
          lname,
          email,
          phone,
        },
      }
    );

    return res.status(200).json({ success: true });
  }

  const emailExists = await Users.findOne({ email });

  if (emailExists) {
    return next(new ErrorHandler("Email Already Exists", 401));
  }

  const hashPassword = await bcrypt.hash(pass, 10);

  const user = await Users.create({
    fname,
    lname,
    phone,
    birthDate: new Date(birthDate).getMilliseconds(),
    email,
    gender,
    password: hashPassword,
  });

  sendToken({ user, cartItems: [] }, 200, res);
});

exports.login = catchAsyncErrors(async (req, res, next) => {
  const { email, password, remember, isAdmin } = req.body;

  if (isAdmin) {
    const user = await Users.findOne({ email, role: "admin" });

    if (user && (await bcrypt.compare(password, user.password))) {
      return sendToken({ user, cartItems: [] }, 200, res);
    }

    return next(new ErrorHandler("Email/password is incorrect", 401));
  }

  const user = await Users.findOne({ email, role: "customer" });

  if (user && (await bcrypt.compare(password, user.password))) {
    return sendToken({ user, cartItems: [] }, 200, res);
  }

  return next(new ErrorHandler("Email/password is incorrect", 401));
});

exports.logout = catchAsyncErrors(async (req, res, next) => {
  return res
    .status(200)
    .clearCookie(req.user.role === "customer" ? "token" : "adminToken")
    .json({ success: true });
});

exports.forgetPassword = catchAsyncErrors(async (req, res, next) => {
  const { email } = req.body;
});
