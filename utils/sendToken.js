const sendToken = ({ user, cartItems }, statuscode, res) => {
  const token = user.getJWTToken();

  const options = {
    expires: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    secure: true,
    sameSite: "none",
    httpOnly: true,
  };

  user.password = undefined;

  return res
    .status(statuscode)
    .cookie(user.role === "customer" ? "token" : "adminToken", token, options)
    .json({
      success: true,
      user,
      cartItems,
    });
};

module.exports = sendToken;
