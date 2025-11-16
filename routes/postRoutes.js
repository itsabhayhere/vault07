const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");

// ============================
// 🔐 Middleware (uncomment when ready)
// ============================
// const { isAuthenticated, isAdmin } = require("../middleware/auth");

// ============================
// 🔐 Admin Routes
// ============================

router.get("/admin/posts/create", /* isAdmin, */ postController.getCreatePostPage);

router.post(
  "/admin/posts",
  /* isAdmin, */
  postController.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "zip", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  postController.createPost
);

router.get("/admin/posts", /* isAdmin, */ postController.getAllPosts);
router.get("/admin/posts/:id", /* isAdmin, */ postController.getPostById);

router.put(
  "/admin/posts/:id",
  /* isAdmin, */
  postController.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "zip", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  postController.updatePost
);

router.delete("/admin/posts/:id", /* isAdmin, */ postController.deletePost);
router.get("/admin/posts/:id/stats", /* isAdmin, */ postController.getPostDownloadStats);
router.get("/admin/downloads/user/:userId", /* isAdmin, */ postController.getUserDownloadHistory);
router.get("/admin/download/:id/:type", /* isAdmin, */ postController.downloadFile);

// ============================
// 📊 API Routes
// ============================
// These routes are mounted under /api in app.js
// So /generate-link becomes /api/generate-link

// Generate download link - called by frontend as /api/generate-link/:id/:type
router.get("/generate-link/:id/:type", /* isAuthenticated, */ postController.generateFileDownloadLink);

// Check user limit - /api/check-limit
router.get("/check-limit", /* isAuthenticated, */ postController.checkUserLimit);

// Get posts by status - /api/posts/status/:status
router.get("/posts/status/:status", postController.getPostsByStatus);

// Single blog post API - /api/blog/:slug
router.get("/blog/:slug", postController.getPostBySlug);

// ============================
// 🔗 Download Routes
// ============================
// These are also under /api prefix

// Download via temporary token - /api/download-temp/:token
router.get("/download-temp/:token", /* isAuthenticated, */ postController.verifyAndDownloadFile);

// Download page - /api/download/:id/:type
router.get("/download/:id/:type", /* isAuthenticated, */ postController.getDownloadPage);

// ============================
// 🌐 Public Routes - MUST COME LAST!
// ============================

// Get all published blogs - /api/blog
router.get("/blog", postController.getPublishedPosts);

module.exports = router;