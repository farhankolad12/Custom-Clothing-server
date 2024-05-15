const mongoose = require("mongoose");

const homePageContentSchema = new mongoose.Schema({
  headerText: {
    type: String,
  },
  mainSliders: [
    {
      id: { type: String },
      img: {
        id: { type: String },
        link: { type: String },
      },
      title: { type: String },
      description: { type: String },
      buttonName: { type: String },
      buttonLink: { type: String },
    },
  ],
  videoSection: {
    thumbnailImg: {
      id: { type: String },
      link: { type: String },
    },
    video: {
      id: { type: String },
      link: { type: String },
    },
  },
  firstBanner: {
    title: { type: String },
    img: {
      id: { type: String },
      link: { type: String },
    },
    description: { type: String },
    categoryName: { type: String },
  },
  secondBanner: {
    title: { type: String },
    description: { type: String },
    categoryName: { type: String },

    img: {
      id: { type: String },
      link: { type: String },
    },
  },
  thirdBanner: {
    title: { type: String },
    description: { type: String },
    categoryName: { type: String },

    img: {
      id: { type: String },
      link: { type: String },
    },
  },
});

module.exports = mongoose.model("HomePageContent", homePageContentSchema);
