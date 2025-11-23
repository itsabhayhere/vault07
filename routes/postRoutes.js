const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController");
const adminMiddleware = require("../middleware/adminMiddleware");

// ============================
// 🔐 Admin Routes
// ============================

router.get(
  "/admin/posts/create",
  adminMiddleware,
  postController.getCreatePostPage
);

router.post(
  "/admin/posts",
  adminMiddleware,
  postController.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "zip", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  postController.createPost
);

router.get(
  "/admin/posts",
  adminMiddleware,
  postController.getAllPosts
);

router.get(
  "/admin/posts/:id",
  adminMiddleware,
  postController.getPostById
);

router.put(
  "/admin/posts/:id",
  adminMiddleware,
  postController.upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "zip", maxCount: 1 },
    { name: "image", maxCount: 1 },
  ]),
  postController.updatePost
);

router.delete(
  "/admin/posts/:id",
  adminMiddleware,
  postController.deletePost
);

router.get(
  "/admin/posts/:id/stats",
  adminMiddleware,
  postController.getPostDownloadStats
);

router.get(
  "/admin/downloads/user/:userId",
  adminMiddleware,
  postController.getUserDownloadHistory
);

router.get(
  "/admin/download/:id/:type",
  adminMiddleware,
  postController.downloadFile
);

// ============================
// 📊 API Routes (Public/Authenticated)
// ============================

router.get("/generate-link/:id/:type", postController.generateFileDownloadLink);
router.get("/check-limit", postController.checkUserLimit);
router.get("/posts/status/:status", postController.getPostsByStatus);
router.get("/blog/:slug", postController.getPostBySlug);

// ============================
// 🔗 Download Routes
// ============================

router.get("/download-temp/:token", postController.verifyAndDownloadFile);
router.get("/download/:id/:type", postController.getDownloadPage);

// ============================
// 🌐 Public Routes
// ============================

router.get("/blog", postController.getPublishedPosts);

router.get("/category/:slug", postController.getPostsByCategory);

module.exports = router;
