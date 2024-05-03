const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Queries = require("../models/queryModel");

exports.addQueries = catchAsyncErrors(async (req, res, next) => {
  const { message, email, name } = req.body;

  const newQuery = new Queries({
    email,
    message,
    name,
  });

  await newQuery.save();

  return res.status(200).json({ success: true });
});
