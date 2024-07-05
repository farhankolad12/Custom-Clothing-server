const catchAsyncErrors = require("../middlewares/catchAsyncErrors");

const handleUpload = require("../utils/uploadImage");
const filterQuery = require("../utils/filterQuery");

const Categories = require("../models/categoryModel");
const Blogs = require("../models/blogModel");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

exports.addBlog = catchAsyncErrors(async (req, res, next) => {
  const {
    title,
    shortDescription,
    fullDescription,
    category,
    tags: unTags,
    image,
    _id,
  } = req.body;

  const tags = JSON.parse(unTags);

  let image1 = undefined;

  const file = req.files[0];
  if (file) {
    const key = `Images/${file.fieldname}_${Date.now()}.jpg`;
    const params = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentDisposition: "inline",
      ContentType: "image/jpeg",
    });
    await s3Client.send(params);
    image1 = {
      id: key,
      link: `https://essentialsbyla.s3.ap-south-1.amazonaws.com/${key}`,
    };
    // const b64 = Buffer.from(file.buffer).toString("base64");
    // const dataURI = "data:" + file.mimetype + ";base64," + b64;
    // const cldRes = await handleUpload(dataURI);
  }

  if (_id) {
    await Blogs.updateOne(
      { _id: _id },
      {
        $set: {
          title,
          category,
          fullDescription,
          image: image1 || image,
          shortDescription,
          tags,
        },
      }
    );

    return res.status(200).json({
      success: true,
      blog: await Blogs.findOne({ _id: _id }),
    });
  }

  const newBlog = new Blogs({
    category,
    fullDescription,
    image: image1 || image,
    title,
    shortDescription,
    tags,
  });

  await newBlog.save();
  return res.status(200).json({ success: true, blog: newBlog });
});

exports.getBlog = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const sort = params.get("sort");

  const {
    data: blogs,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  } = await filterQuery(searchParams, ["title", "category"], Blogs, sort);

  return res.status(200).json({
    blogs,
    totalPages,
    currentPage,
    totalDocuments,
    startDocument,
    lastDocument,
  });
});

exports.filterBlogs = catchAsyncErrors(async (req, res, next) => {
  const { searchParams } = req.query;

  const params = new URLSearchParams(searchParams);
  const currentPage = Number(params.get("page")) || 1;
  const pageSize = 4;

  const category =
    params
      .get("category")
      ?.split(",")
      .filter((cat) => cat !== "") || [];

  const filterQuery = {
    $and: [
      {
        category: {
          $in: category.length
            ? category
            : (await Categories.find()).map((cat) => cat.name),
        },
      },
      {
        $or: params.get("query")
          ? [
              {
                title: {
                  $regex: params.get("query") || "",
                  $options: "i",
                },
              },
              {
                "tags.tag": {
                  $regex: params.get("query").split(" ").join("-") || "",
                  $options: "i",
                },
              },
            ]
          : [{}],
      },
    ],
  };

  const totalDocuments = await Blogs.countDocuments(filterQuery);

  const blogs = await Blogs.find(filterQuery)
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1))
    .sort({ createdAt: -1 });

  const relatedPosts = await Blogs.find().sort({ created: -1 }).limit(4);

  return res.status(200).json({
    blogs,
    totalPages: Math.ceil(totalDocuments / pageSize),
    currentPage,
    totalDocuments,
    startDocument: pageSize * (currentPage - 1) + 1,
    lastDocument: pageSize * (currentPage - 1) + blogs.length,
    relatedPosts,
  });
});

exports.getBlogById = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.query;

  const blog = await Blogs.findOne({ _id: id });

  return res.status(200).json(blog);
});

exports.blogsSitemap = catchAsyncErrors(async (req, res, next) => {
  const batchSize = 10;
  let skip = 0;
  let blogs = [];

  while (true) {
    const batchBlogs = await Blogs.find({}, { _id: 1 })
      .skip(skip)
      .limit(batchSize);

    if (batchBlogs.length === 0) {
      break;
    }

    blogs = blogs.concat(batchBlogs);
    skip += batchSize;
  }

  return res.status(200).json(blogs);
});

exports.deleteBlog = catchAsyncErrors(async (req, res, next) => {
  const { _id } = req.body;

  await Blogs.deleteOne({ _id: _id });

  return res.status(200).json({ success: true });
});
