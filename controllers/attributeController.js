const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const filterQuery = require("../utils/filterQuery");

const Attributes = require("../models/attributeModel");

exports.addAttributes = catchAsyncErrors(async (req, res, next) => {
  const { title, displayName, type, options, _id } = req.body;

  if (_id) {
    await Attributes.updateOne(
      { _id: _id },
      { $set: { title, displayName, type, options } }
    );

    return res.status(200).json({
      success: true,
      attribute: await Attributes.findOne({ _id: _id }),
    });
  }

  const attribute = new Attributes({
    displayName,
    options,
    title,
    type,
  });

  await attribute.save();

  return res.status(200).json({ success: true, attribute });
});

exports.getAttributes = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const {
    currentPage,
    data: attributes,
    lastDocument,
    startDocument,
    totalDocuments,
    totalPages,
  } = await filterQuery(searchParams, ["displayName", "title"], Attributes);

  return res.status(200).json({
    attributes,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  });
});

exports.deleteAttribute = catchAsyncErrors(async (req, res, next) => {
  await Attributes.deleteOne({ _id: req.body._id });

  return res.status(200).json({ success: true });
});
