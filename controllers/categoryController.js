const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const handleUpload = require("../utils/uploadImage");
const filterQuery = require("../utils/filterQuery");

const Categories = require("../models/categoryModel");

exports.getCategories = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const {
    data: categories,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  } = await filterQuery(searchParams, ["name", "description"], Categories);

  return res.status(200).json({
    categories,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  });
});

exports.addCategory = catchAsyncErrors(async (req, res, next) => {
  const { description, name, _id } = req.body;
  const file = req.files[0];

  if (_id) {
    if (file) {
      const b64 = Buffer.from(file.buffer).toString("base64");
      let dataURI = "data:" + file.mimetype + ";base64," + b64;
      const cldRes = await handleUpload(dataURI);
      const icon = { id: cldRes.public_id, link: cldRes.url };
      await Categories.updateOne(
        { _id: _id },
        { $set: { name, description, icon } }
      );
    } else {
      await Categories.updateOne({ _id: _id }, { $set: { name, description } });
    }

    return res.status(200).json({
      success: true,
      category: await Categories.findOne({ _id: _id }),
    });
  }

  const b64 = Buffer.from(file.buffer).toString("base64");
  const dataURI = "data:" + file.mimetype + ";base64," + b64;
  const cldRes = await handleUpload(dataURI);
  const icon = { id: cldRes.public_id, link: cldRes.url };

  const category = new Categories({
    name,
    description,
    icon,
  });

  await category.save();

  return res.status(200).json({ success: true, category });
});

exports.deleteCategory = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.body;

  await Categories.deleteOne({ _id: _id });

  return res.status(200).json({ success: true });
});
