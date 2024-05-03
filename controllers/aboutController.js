const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const handleUpload = require("../utils/uploadImage");

const AboutPageContent = require("../models/aboutPageContentModel");

exports.updateAboutPage = catchAsyncErrors(async (req, res, next) => {
  const { changeType, data } = req.body;

  const aboutPageContent = await AboutPageContent.find();

  const imgFiles = req.files;

  const img1 = [];

  for (let i = 0; i < imgFiles.length; i++) {
    const file = imgFiles[i];
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    const icon = { id: cldRes.public_id, link: cldRes.url };
    img1.push({ icon, id: file.fieldname });
  }

  if (!aboutPageContent.length) {
    const newData = new AboutPageContent({
      [changeType]:
        changeType === "topImage"
          ? img1.filter((img) => img.id === "topImage")[0].icon ||
            JSON.parse(data)
          : changeType === "firstAbout"
          ? {
              ...JSON.parse(data),
              img:
                img1.filter((img) => img.id === "firstAboutImg")[0].icon ||
                JSON.parse(data).img,
            }
          : changeType === "secondAbout"
          ? {
              ...JSON.parse(data),
              img:
                img1.filter((img) => img.id === "secondAboutImg")[0].icon ||
                JSON.parse(data).img,
            }
          : changeType === "videoSection"
          ? {
              thumbnail:
                img1.filter((img) => img.id === "thumbnail")[0].icon ||
                JSON.parse(data).thumbnail,
              video:
                img1.filter((img) => img.id === "video")[0].icon ||
                JSON.parse(data).video,
            }
          : {},
    });
    await newData.save();

    return res.status(200).json({ success: true });
  }

  switch (changeType) {
    case "topImage":
      await AboutPageContent.updateOne(
        { _id: aboutPageContent[0]._id },
        {
          $set: {
            topImage:
              img1.filter((img) => img.id === "topImage")[0].icon ||
              JSON.parse(data),
          },
        }
      );
      break;

    case "videoSection":
      await AboutPageContent.updateOne(
        { _id: aboutPageContent[0]._id },
        {
          $set: {
            videoSection: {
              thumbnail:
                img1.filter((img) => img.id === "thumbnail")[0]?.icon ||
                JSON.parse(data),
              video:
                img1.filter((img) => img.id === "video")[0]?.icon ||
                JSON.parse(data),
            },
          },
        }
      );
      break;

    case "firstAbout":
      await AboutPageContent.updateOne(
        { _id: aboutPageContent[0]._id },
        {
          $set: {
            firstAbout: {
              ...JSON.parse(data),
              img:
                img1.filter((img) => img.id === "firstAboutImg")[0]?.icon ||
                JSON.parse(data.img),
            },
          },
        }
      );
      break;

    case "secondAbout":
      await AboutPageContent.updateOne(
        { _id: aboutPageContent[0]._id },
        {
          $set: {
            secondAbout: {
              ...JSON.parse(data),
              img:
                img1.filter((img) => img.id === "secondAboutImg")[0]?.icon ||
                JSON.parse(data.img),
            },
          },
        }
      );
      break;

    default:
      return res
        .status(500)
        .json({ success: false, message: "Unknow changeType given" });
  }

  return res.status(200).json({ success: true });
});

exports.getAboutPage = catchAsyncErrors(async (req, res, next) => {
  return res.status(200).json(await AboutPageContent.findOne());
});
