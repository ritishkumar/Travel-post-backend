const express = require("express");
const multer = require("multer");
const Post = require("../models/Post");
const router = express.Router();
const fs = require('fs');
const path = require('path');

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1000 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "images") {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed!'), false);
      }
    } else if (file.fieldname === "video") {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new Error('Only video files are allowed!'), false);
      }
    }
    cb(null, true);
  }
}).fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]);

// Create post route
router.post("/", (req, res) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err);
      return res.status(400).json({
        message: err.code === 'LIMIT_FILE_SIZE' 
          ? 'File is too large. Maximum size is 100MB'
          : 'Error uploading file',
        error: err.message
      });
    } else if (err) {
      console.error("Unknown error:", err);
      return res.status(400).json({
        message: 'Error uploading file',
        error: err.message
      });
    }

    try {
      const { title, description, location } = req.body;

      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }

      // Handle multiple images
      const images = req.files?.images 
        ? req.files.images.map(file => `uploads/${file.filename}`)
        : [];

      // Handle video
      const videoUrl = req.files?.video?.[0]
        ? `uploads/${req.files.video[0].filename}`
        : null;

      const newPost = new Post({
        title,
        description,
        location,
        images,
        videoUrl
      });

      const savedPost = await newPost.save();
      res.status(201).json(savedPost);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Error creating post", error: error.message });
    }
  });
});

// Get all posts route
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching posts", error: error.message });
  }
});

// Delete post route
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Delete all images if they exist
    if (post.images && post.images.length > 0) {
      for (const imagePath of post.images) {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
        }
      }
    }

    // Delete video if it exists
    if (post.videoUrl) {
      const videoPath = path.join(__dirname, '..', post.videoUrl);
      if (fs.existsSync(videoPath)) {
        await fs.promises.unlink(videoPath);
      }
    }

    // Delete post from database
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ message: "Error deleting post", error: error.message });
  }
});

module.exports = router;
