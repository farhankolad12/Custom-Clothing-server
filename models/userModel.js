const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema({
  fname: {
    type: String,
  },
  lname: {
    type: String,
  },
  phone: {
    type: String,
  },
  birthDate: {
    type: String,
  },
  gender: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    default: "customer",
  },
  usedCoupons: {
    type: [String],
  },
  createdAt: {
    type: Number,
    default: Date.now,
  },
});

userSchema.methods.getJWTToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

module.exports = mongoose.model("Users", userSchema);
