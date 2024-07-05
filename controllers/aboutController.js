const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const handleUpload = require("../utils/uploadImage");

const AboutPageContent = require("../models/aboutPageContentModel");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

exports.updateAboutPage = catchAsyncErrors(async (req, res, next) => {
  const { changeType, data } = req.body;

  const aboutPageContent = await AboutPageContent.find();

  const imgFiles = req.files;

  const img1 = [];

  for (let i = 0; i < imgFiles.length; i++) {
    const file = imgFiles[i];

    const key = `Images/${file.fieldname}_${Date.now()}.jpg`;

    const params = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentDisposition: "inline",
      ContentType: "image/jpeg",
    });
    await s3Client.send(params);

    img1.push({
      icon: {
        id: key,
        link: `https://essentialsbyla.s3.ap-south-1.amazonaws.com/${key}`,
      },
      id: file.fieldname,
    });
    // const b64 = Buffer.from(file.buffer).toString("base64");
    // const dataURI = "data:" + file.mimetype + ";base64," + b64;
    // const cldRes = await handleUpload(dataURI);
    // const icon = { id: cldRes.public_id, link: cldRes.url };
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
