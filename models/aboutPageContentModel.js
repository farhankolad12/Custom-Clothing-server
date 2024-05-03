const mongoose = require("mongoose");

const aboutPageContentSchema = new mongoose.Schema({
  topImage: {
    id: { type: String },
    link: { type: String },
  },
  videoSection: {
    thumbnail: {
      id: { type: String },
      link: { type: String },
    },
    video: {
      id: { type: String },
      link: { type: String },
    },
  },
  firstAbout: {
    title: { type: String },
    img: {
      id: { type: String },
      link: { type: String },
    },
    description: { type: String },
    buttonName: { type: String },
    buttonLink: { type: String },
  },
  secondAbout: {
    title: { type: String },
    description: { type: String },
    buttonName: { type: String },
    buttonLink: { type: String },
    img: {
      id: { type: String },
      link: { type: String },
    },
  },
});

module.exports = mongoose.model("AboutPageContent", aboutPageContentSchema);
