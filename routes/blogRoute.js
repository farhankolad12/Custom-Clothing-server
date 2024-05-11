const express = require("express");
const cors = require("cors");
const Multer = require("multer");

const { isAuthenticate, authorizeRoles } = require("../middlewares/auth");
const {
  addBlog,
  getBlog,
  deleteBlog,
  filterBlogs,
  blogsSitemap,
  getBlogById,
} = require("../controllers/blogController");

const storage = new Multer.memoryStorage();
const upload = Multer({
  storage,
});

const router = express.Router();

router.use(
  cors({
    origin: [process.env.CLIENT_HOST_NAME, process.env.CLIENT_ADMIN_HOST_NAME],
    optionsSuccessStatus: 200,
    preflightContinue: true,
    credentials: true,
  })
);

router.route("/filter-blogs").get(filterBlogs);
router.route("/blogs-sitemap").get(blogsSitemap);
router.route("/blog-id").get(getBlogById);
router
  .route("/blogs")
  .post(isAuthenticate, authorizeRoles("admin"), upload.any(), addBlog);
router.route("/blogs").get(isAuthenticate, authorizeRoles("admin"), getBlog);
router
  .route("/remove-blog")
  .post(isAuthenticate, authorizeRoles("admin"), deleteBlog);

module.exports = router;
