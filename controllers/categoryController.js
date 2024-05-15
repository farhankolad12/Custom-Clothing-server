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
  const { description, name, _id, tags: uTags } = req.body;
  const files = req.files;

  const tags = JSON.parse(uTags);

  if (_id) {
    if (files.length) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const b64 = Buffer.from(file.buffer).toString("base64");
        let dataURI = "data:" + file.mimetype + ";base64," + b64;
        const cldRes = await handleUpload(dataURI);
        const icon = { id: cldRes.public_id, link: cldRes.url };
        await Categories.updateOne(
          { _id: _id },
          {
            $set:
              file.fieldname === "catImg"
                ? { name, description, icon, tags }
                : { name, description, bannerImg: icon, tags },
          }
        );
      }
    } else {
      await Categories.updateOne(
        { _id: _id },
        { $set: { name, description, tags } }
      );
    }

    return res.status(200).json({
      success: true,
      category: await Categories.findOne({ _id: _id }),
    });
  } else {
    let icon = undefined;
    let bannerImg = undefined;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = "data:" + file.mimetype + ";base64," + b64;
      const cldRes = await handleUpload(dataURI);
      if (file.fieldname === "catImg" && icon === undefined) {
        icon = { id: cldRes.public_id, link: cldRes.url };
      } else if (file.fieldname === "catBannerImg" && bannerImg === undefined) {
        bannerImg = { id: cldRes.public_id, link: cldRes.url };
      }
    }

    const category = new Categories({
      name,
      description,
      icon,
      bannerImg,
      tags,
    });

    await category.save();

    return res.status(200).json({ success: true, category });
  }
});

exports.deleteCategory = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.body;

  await Categories.deleteOne({ _id: _id });

  return res.status(200).json({ success: true });
});
