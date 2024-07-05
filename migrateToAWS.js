const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const Products = require("./models/productModel");
const Categories = require("./models/categoryModel");
const HomePageContent = require("./models/homePageContentModel");
const AboutUsPageContent = require("./models/aboutPageContentModel");
const Coupons = require("./models/couponModel");

dotenv.config();

// const cloudinary = require("cloudinary").v2;
// const https = require("https");
const fs = require("fs");
const path = require("path");
const connectDatabase = require("./config/database");

// const connectCloudinary = require("./config/cloudinaryUpload");
// connectCloudinary();

connectDatabase();

// const getImages = async () => {
//   try {
//     let allResources = [];
//     let nextCursor = null;
//     do {
//       const options = {
//         max_results: 500,
//         next_cursor: nextCursor,
//       };

//       const result = await cloudinary.api.resources(options);

//       allResources = allResources.concat(result.resources);
//       nextCursor = result.next_cursor;
//     } while (nextCursor);

//     const client = https;

//     return new Promise((resolve, reject) => {
//       allResources.map((img) => {
//         const fileExists = fs.existsSync(
//           `public/downloads/${img.public_id}.${img.format}`
//         );
//         if (fileExists) {
//           console.log(`Already Exists Image ${img.public_id}`);
//           return;
//         }

//         client.get(img.secure_url, (res) => {
//           res
//             .pipe(
//               fs.createWriteStream(
//                 `public/downloads/${img.public_id}.${img.format}`
//               )
//             )
//             .on("error", reject)
//             .once("close", () =>
//               resolve(`public/downloads/${img.public_id}.${img.format}`)
//             );
//           console.log(`Image ${img.public_id} saved!`);
//         });
//       });
//     });
//   } catch (err) {
//     console.log(err);
//   }
// };

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const uploadImageToS3 = async () => {
  fs.readdir("public/downloads", async (err, files) => {
    if (err) {
      return console.error("Unable to scan directory: " + err);
    }

    // Filter image files (assuming they have extensions like .jpg, .png, etc.)
    // const imageFiles = files.filter((file) =>
    //   /\.(jpg|jpeg|png|gif|webp|avif|jfif|pjpeg|pjp|svg)$/i.test(file)
    // );

    // Process each image file
    await Promise.all(
      files.map((file) => {
        const filePath = path.join("public/downloads", file);

        // Read the image file as a buffer
        fs.readFile(filePath, async (err, data) => {
          if (err) {
            return console.error("Error reading file:", filePath, err);
          }

          const imageName = file;
          const buffer = data;

          const updatedImageURL = `https://essentialsbyla.s3.ap-south-1.amazonaws.com/Images/${imageName}`;

          const coupon = await Coupons.findOne({
            "image.link": { $regex: imageName, $options: "i" },
          });

          if (coupon?.image.link.includes(imageName)) {
            const params = new PutObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET,
              Key: `Images/${imageName}`,
              Body: buffer,
              ContentDisposition: "inline",
              ContentType: "image/jpeg",
            });
            await s3Client.send(params);
            await Coupons.updateOne(
              { _id: coupon._id },
              { $set: { image: { id: imageName, link: updatedImageURL } } }
            );

            console.log(`Image updated for ${imageName}`);
          }

          // const topImage = aboutUsPage.topImage.link;
          // const firstAboutImg = aboutUsPage.firstAbout.img.link;
          // const secondAbout = aboutUsPage.secondAbout.img.link;
          // const videoSection = aboutUsPage.videoSection.thumbnail.link;

          // if (videoSection.includes(imageName)) {
          // const params = new PutObjectCommand({
          //   Bucket: process.env.AWS_S3_BUCKET,
          //   Key: `Images/${imageName}`,
          //   Body: buffer,
          //   ContentDisposition: "inline",
          //   ContentType: "image/jpeg",
          // });
          // await s3Client.send(params);

          //   await AboutUsPageContent.updateOne(
          //     { _id: aboutUsPage._id },
          //     {
          //       $set: {
          //         videoSection: {
          //           thumbnail: {
          //             id: imageName,
          //             link: updatedImageURL,
          //           },
          //         },
          //       },
          //     }
          //   );

          //   console.log(`Video About Image updated ${imageName}`);
          // }

          // if (secondAbout.includes(imageName)) {
          //   const params = new PutObjectCommand({
          //     Bucket: process.env.AWS_S3_BUCKET,
          //     Key: `Images/${imageName}`,
          //     Body: buffer,
          //     ContentDisposition: "inline",
          //     ContentType: "image/jpeg",
          //   });
          //   await s3Client.send(params);

          //   await AboutUsPageContent.updateOne(
          //     { _id: aboutUsPage._id },
          //     {
          //       $set: {
          //         secondAbout: {
          //           ...aboutUsPage.secondAbout,
          //           img: { link: updatedImageURL, id: imageName },
          //         },
          //       },
          //     }
          //   );

          //   console.log(`Second About Image updated ${imageName}`);
          // }

          // if (firstAboutImg.includes(imageName)) {
          //   const params = new PutObjectCommand({
          //     Bucket: process.env.AWS_S3_BUCKET,
          //     Key: `Images/${imageName}`,
          //     Body: buffer,
          //     ContentDisposition: "inline",
          //     ContentType: "image/jpeg",
          //   });
          //   await s3Client.send(params);

          //   await AboutUsPageContent.updateOne(
          //     { _id: aboutUsPage._id },
          //     {
          //       $set: {
          //         firstAbout: {
          //           ...aboutUsPage.firstAbout,
          //           img: { link: updatedImageURL, id: imageName },
          //         },
          //       },
          //     }
          //   );

          //   console.log(`First About Image updated ${imageName}`);
          // }

          // if (topImage.includes(imageName)) {
          //   const params = new PutObjectCommand({
          //     Bucket: process.env.AWS_S3_BUCKET,
          //     Key: `Images/${imageName}`,
          //     Body: buffer,
          //     ContentDisposition: "inline",
          //     ContentType: "image/jpeg",
          //   });
          //   await s3Client.send(params);

          //   await AboutUsPageContent.updateOne(
          //     { _id: aboutUsPage._id },
          //     {
          //       $set: {
          //         topImage: { link: updatedImageURL, id: imageName },
          //       },
          //     }
          //   );

          //   console.log(`Top Image updated ${imageName}`);
          // }

          // const homePageContents = await HomePageContent.findOne();

          // const logoImg = homePageContents.logo.link;

          // if (logoImg.includes(imageName)) {
          // const params = new PutObjectCommand({
          //   Bucket: process.env.AWS_S3_BUCKET,
          //   Key: `Images/${imageName}`,
          //   Body: buffer,
          //   ContentDisposition: "inline",
          //   ContentType: "image/jpeg",
          // });
          // await s3Client.send(params);

          // await HomePageContent.updateOne(
          //   { _id: homePageContents._id },
          //   {
          //     $set: {
          //       logo: { link: updatedImageURL, id: imageName },
          //     },
          //   }
          // );

          // console.log(`Logo updated ${imageName}`);
          // }

          // const secondBannerImg = homePageContents.secondBanner.img.link;

          // if (secondBannerImg.includes(imageName)) {
          // const params = new PutObjectCommand({
          //   Bucket: process.env.AWS_S3_BUCKET,
          //   Key: `Images/${imageName}`,
          //   Body: buffer,
          //   ContentDisposition: "inline",
          //   ContentType: "image/jpeg",
          // });
          // await s3Client.send(params);

          // await HomePageContent.updateOne(
          //   { _id: homePageContents._id },
          //   {
          //     $set: {
          //       secondBanner: {
          //         ...homePageContents.secondBanner,
          //         img: { link: updatedImageURL, id: imageName },
          //       },
          //     },
          //   }
          // );

          // console.log(`Image for Second Banner ${imageName}`);
          // }

          // const thirdBannerImg = homePageContents.thirdBanner.img.link;

          // if (thirdBannerImg.includes(imageName)) {
          //   const params = new PutObjectCommand({
          //     Bucket: process.env.AWS_S3_BUCKET,
          //     Key: `Images/${imageName}`,
          //     Body: buffer,
          //     ContentDisposition: "inline",
          //     ContentType: "image/jpeg",
          //   });
          //   await s3Client.send(params);

          //   await HomePageContent.updateOne(
          //     { _id: homePageContents._id },
          //     {
          //       $set: {
          //         thirdBanner: {
          //           ...homePageContents.thirdBanner,
          //           img: { link: updatedImageURL, id: imageName },
          //         },
          //       },
          //     }
          //   );

          //   console.log(`Image for Third Banner ${imageName}`);
          // }

          // const firstBannerImg = homePageContents.firstBanner.img.link;

          // if (firstBannerImg.includes(imageName)) {
          //   const params = new PutObjectCommand({
          //     Bucket: process.env.AWS_S3_BUCKET,
          //     Key: `Images/${imageName}`,
          //     Body: buffer,
          //     ContentDisposition: "inline",
          //     ContentType: "image/jpeg",
          //   });
          //   await s3Client.send(params);

          //   await HomePageContent.updateOne(
          //     { _id: homePageContents._id },
          //     {
          //       $set: {
          //         firstBanner: {
          //           ...homePageContents.firstBanner,
          //           img: { link: updatedImageURL, id: imageName },
          //         },
          //       },
          //     }
          //   );

          //   console.log(`Image uploaded ${imageName}`);
          // }

          // const imageExists1 = await Categories.findOne({
          //   "icon.link": { $regex: updatedImageURL, $options: "i" },
          // });
          // if (!imageExists1) {
          // const params = new PutObjectCommand({
          //   Bucket: process.env.AWS_S3_BUCKET,
          //   Key: `Images/${imageName}`,
          //   Body: buffer,
          //   ContentDisposition: "inline",
          //   ContentType: "image/jpeg",
          // });
          // await s3Client.send(params);

          // const category = await Categories.findOne({
          //   "icon.link": { $regex: imageName, $options: "i" },
          // }).select("_id images name");

          // if (category) {
          //   const newImages = {
          //     id: imageName,
          //     link: updatedImageURL,
          //   };

          //   await Categories.updateOne(
          //     { _id: category._id },
          //     { $set: { icon: newImages } }
          //   );

          //   console.log(`Image Updated for category ${category.name}`);
          // }
          // }

          // const imageExists2 = await Categories.findOne({
          //   "bannerImg.link": { $regex: updatedImageURL, $options: "i" },
          // });

          // // if (!imageExists2) {
          // //   const params = new PutObjectCommand({
          // //     Bucket: process.env.AWS_S3_BUCKET,
          // //     Key: `Images/${imageName}`,
          // //     Body: buffer,
          // //     ContentDisposition: "inline",
          // //     ContentType: "image/jpeg",
          // //   });
          // //   await s3Client.send(params);

          // //   const category = await Categories.findOne({
          // //     "bannerImg.link": { $regex: imageName, $options: "i" },
          // //   }).select("_id images name");

          // //   if (category) {
          // //     const newImages = {
          // //       id: imageName,
          // //       link: updatedImageURL,
          // //     };

          // //     await Categories.updateOne(
          // //       { _id: category._id },
          // //       { $set: { bannerImg: newImages } }
          // //     );

          // //     console.log(`Image Updated for category ${category.name}`);
          // //   }
          // // }

          // const imageExists = await Products.findOne({
          //   images: {
          //     $elemMatch: { link: { $regex: updatedImageURL, $options: "i" } },
          //   },
          // });

          // if (!imageExists) {
          //   const params = new PutObjectCommand({
          //     Bucket: process.env.AWS_S3_BUCKET,
          //     Key: `Images/${imageName}`,
          //     Body: buffer,
          //     ContentDisposition: "inline",
          //     ContentType: "image/jpeg",
          //   });
          //   await s3Client.send(params);

          //   const product = await Products.findOne({
          //     images: {
          //       $elemMatch: { link: { $regex: imageName, $options: "i" } },
          //     },
          //   }).select("_id images name");

          //   if (product) {
          //     const newImages = product.images.map((img) =>
          //       img.link.includes(imageName)
          //         ? { ...img._doc, link: updatedImageURL }
          //         : img
          //     );

          //     await Products.updateOne(
          //       { _id: product._id },
          //       { $set: { images: newImages } }
          //     );

          //     console.log(`Image Updated for product ${product.name}`);
          //   }
          // }
        });
      })
    );
  });
};

async function init() {
  await connectDatabase();

  uploadImageToS3();

  // Delete Uploaded Images
  // fs.readdir("public/downloads", async (err, files) => {
  //   if (err) {
  //     return console.error("Unable to scan directory: " + err);
  //   }

  //   files.map(async (file) => {
  //     const updatedImageURL = `https://essentialsbyla.s3.ap-south-1.amazonaws.com/Images/${file}`;

  //     const imageExists = await Categories.findOne({
  //       $or: [
  //         {
  //           "icon.link": { $regex: updatedImageURL, $options: "i" },
  //         },
  //         {
  //           "bannerImg.link": { $regex: updatedImageURL, $options: "i" },
  //         },
  //       ],
  //     });

  //     if (imageExists) {
  //       fs.unlinkSync(`public/downloads/${file}`);
  //     }
  //     console.log(`Image Deleted: ${file}`);
  //   });
  // });
}

init();
