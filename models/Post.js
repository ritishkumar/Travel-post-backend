const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title is required"]
  },
  description: {
    type: String,
    required: [true, "Description is required"]
  },
  location: {
    type: String
  },
  images: [{
    type: String
  }],
  videoUrl: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Post", PostSchema);
