const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const HomePageContent = require("../models/homePageContentModel");
const handleUpload = require("../utils/uploadImage");

exports.updateLogo = catchAsyncErrors(async (req, res, next) => {
  const homePageContent = await HomePageContent.find();
  const logoFile = req.files[0];

  let logo;

  if (logoFile) {
    const b64 = Buffer.from(logoFile.buffer).toString("base64");
    const dataURI = "data:" + logoFile.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    logo = { id: cldRes.public_id, link: cldRes.url };
  }

  if (homePageContent.length === 0) {
    const newData = new HomePageContent({
      logo,
    });

    await newData.save();
    return res.status(200).json({ success: true });
  }

  await HomePageContent.updateOne(
    { _id: homePageContent[0]._id },
    { $set: { logo: logoFile ? logo : homePageContent[0].logo } }
  );

  return res.status(200).json({ success: true });
});
