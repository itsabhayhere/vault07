const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

// ============================
// 🔐 Admin Routes (Protected)
// ============================

// Render create post page
router.get("/admin/posts/create", postController.getCreatePostPage);

// Create new post
router.post(
  "/admin/posts",
  postController.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  postController.createPost
);

// Get all posts (admin view)
router.get("/admin/posts", postController.getAllPosts);

// Get single post by ID
router.get("/admin/posts/:id", postController.getPostById);

// Update post
router.put(
  "/admin/posts/:id",
  postController.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  postController.updatePost
);

// Delete post
router.delete("/admin/posts/:id", postController.deletePost);

// Direct PDF download (admin use)
router.get("/admin/download/:id", postController.downloadPDF);

// ============================
// 🌐 Public Routes
// ============================

// Get all published blogs
router.get("/blog", postController.getPublishedPosts);

// Get single blog by slug
router.get("/blog/:slug", postController.getPostBySlug);

// ============================
// 🔗 Download Routes
// ============================

// Generate temporary download link (1-hour validity)
router.get("/generate-link/:id", postController.generatePDFDownloadLink);

// Download via temporary token
router.get("/download-temp/:token", postController.verifyAndDownloadPDF);

// ============================
// 📊 API Routes
// ============================

// Get posts by status
router.get("/api/posts/status/:status", postController.getPostsByStatus);

module.exports = router;