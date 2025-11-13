const crypto = require("crypto");
const Post = require("../models/Post");
const slugify = require("slugify");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================
// 📁 Constants
// ============================
const UPLOAD_DIRS = {
  PDF: "uploads/pdfs",
  IMAGE: "uploads/images",
  OTHER: "uploads/others",
};

const ALLOWED_FILE_TYPES = {
  PDF: ["application/pdf"],
  IMAGE: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
};

const FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const TOKEN_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_TITLE_LENGTH = 200;
const ALLOWED_STATUSES = ["draft", "published", "archived"];

// ============================
// 🧠 In-memory Token Store with Auto-cleanup
// ============================
const activeDownloadTokens = new Map();

// Periodic cleanup of expired tokens
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of activeDownloadTokens.entries()) {
    if (now > data.expiresAt) {
      activeDownloadTokens.delete(token);
    }
  }
}, TOKEN_CLEANUP_INTERVAL);

// ============================
// 🛡️ Security Helper Functions
// ============================

/**
 * Validates and sanitizes file path to prevent directory traversal
 */
function validateFilePath(filePath, baseDir = "uploads") {
  if (!filePath) return null;

  // Normalize and remove any parent directory references
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(__dirname, "..", normalizedPath);
  const basePath = path.join(__dirname, "..", baseDir);

  // Ensure the resolved path is within the base directory
  if (!fullPath.startsWith(basePath)) {
    throw new Error("Invalid file path");
  }

  return fullPath;
}

/**
 * Checks if file exists on filesystem
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Validates status value
 */
function isValidStatus(status) {
  return ALLOWED_STATUSES.includes(status);
}

/**
 * Sanitizes title (basic XSS prevention)
 */
function sanitizeTitle(title) {
  return title.trim().substring(0, MAX_TITLE_LENGTH);
}

// ============================
// 📁 Multer Configuration (Image + PDF)
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = UPLOAD_DIRS.OTHER;

    if (file.mimetype === "application/pdf") {
      uploadDir = UPLOAD_DIRS.PDF;
    } else if (file.mimetype.startsWith("image/")) {
      uploadDir = UPLOAD_DIRS.IMAGE;
    }

    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const slug = slugify(req.body.title || "untitled", {
      lower: true,
      strict: true,
    });
    const ext = path.extname(file.originalname);
    const timestamp = Date.now();
    const randomStr = crypto.randomBytes(4).toString("hex");
    cb(null, `${slug}-${timestamp}-${randomStr}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ...ALLOWED_FILE_TYPES.PDF,
    ...ALLOWED_FILE_TYPES.IMAGE,
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF or image files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: FILE_SIZE_LIMIT },
});

// ============================
// 🧾 Render Create Post Page (Admin)
// ============================
function getCreatePostPage(req, res) {
  res.render("admin/create-blog", {
    title: "Create New Post",
    user: req.user,
    layout: "admin/adminLayout",
  });
}

// ============================
// 📝 CREATE POST
// ============================
async function createPost(req, res) {
  try {
    const { title, content, status } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const sanitizedTitle = sanitizeTitle(title);
    if (sanitizedTitle.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title cannot be empty",
      });
    }

    // Validate status
    const postStatus = status || "draft";
    if (!isValidStatus(postStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const slug = slugify(sanitizedTitle, { lower: true, strict: true });

    // Handle file uploads
    const pdfPath = req.files?.pdf
      ? `/uploads/pdfs/${req.files.pdf[0].filename}`
      : null;
    const imagePath = req.files?.image
      ? `/uploads/images/${req.files.image[0].filename}`
      : null;

    const newPost = new Post({
      title: sanitizedTitle,
      slug,
      content,
      pdf: pdfPath,
      blogImage: imagePath,
      status: postStatus,
    });

    await newPost.save();

    return res.status(201).json({
      success: true,
      message: "Blog created successfully!",
      post: newPost,
    });
  } catch (error) {
    console.error("❌ Error creating post:", error);

    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A post with this title already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating the post",
    });
  }
}

// ============================
// 📋 READ ALL POSTS (Admin)
// ============================
async function getAllPosts(req, res) {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 });
    res.render("admin/post", {
      posts,
      title: "All Blog Posts",
      user: req.user,
      layout: "admin/adminLayout",
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).render("error", {
      message: "Error loading posts",
      user: req.user,
    });
  }
}

// ============================
// 🔍 READ SINGLE POST BY ID (Admin)
// ============================
async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching the post",
    });
  }
}

// ============================
// ✏️ UPDATE POST
// ============================
async function updatePost(req, res) {
  try {
    const { title, content, status } = req.body;
    const postId = req.params.id;

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    const sanitizedTitle = sanitizeTitle(title);
    if (sanitizedTitle.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Title cannot be empty",
      });
    }

    // Validate status if provided
    if (status && !isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const slug = slugify(sanitizedTitle, { lower: true, strict: true });
    const updateData = { title: sanitizedTitle, content, slug };

    if (status) {
      updateData.status = status;
    }

    // Handle updated files
    if (req.files?.pdf) {
      updateData.pdf = `/uploads/pdfs/${req.files.pdf[0].filename}`;
    }
    if (req.files?.image) {
      updateData.blogImage = `/uploads/images/${req.files.image[0].filename}`;
    }

    const updatedPost = await Post.findByIdAndUpdate(postId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Error updating post:", error);

    // Handle duplicate slug error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A post with this title already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error updating the post",
    });
  }
}

// ============================
// 🗑️ DELETE POST
// ============================
async function deletePost(req, res) {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Optional: Delete associated files from filesystem
    try {
      if (deletedPost.pdf) {
        const pdfPath = validateFilePath(deletedPost.pdf);
        if (pdfPath && fileExists(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }
      if (deletedPost.blogImage) {
        const imagePath = validateFilePath(deletedPost.blogImage);
        if (imagePath && fileExists(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    } catch (fileError) {
      console.error("Error deleting files:", fileError);
      // Continue even if file deletion fails
    }

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting the post",
    });
  }
}

// ============================
// 📊 FILTER BY STATUS (API)
// ============================
async function getPostsByStatus(req, res) {
  try {
    const status = req.params.status;

    if (!isValidStatus(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const posts = await Post.find({ status }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Error fetching posts by status:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts by status",
    });
  }
}

// ============================
// 🌐 PUBLIC: Get All Published Blogs
// ============================
async function getPublishedPosts(req, res) {
  try {
    const posts = await Post.find({ status: "published" }).sort({
      createdAt: -1,
    });

    res.render("pages/blog-list", {
      posts,
      title: "Our Blog",
      user: req.user,
      layout: "layouts/main",
    });
  } catch (error) {
    console.error("Error loading blogs:", error);
    res.status(500).render("error", {
      message: "Error loading blogs",
      user: req.user,
    });
  }
}

// ============================
// 🌐 PUBLIC: Get Blog by Slug
// ============================
async function getPostBySlug(req, res) {
  try {
    const post = await Post.findOne({ slug: req.params.slug });

    if (!post) {
      return res.status(404).render("pages/404", {
        title: "Post Not Found",
        user: req.user,
        layout: "layouts/main",
      });
    }

    // Only show published posts to public
    if (post.status !== "published" && (!req.user || !req.user.isAdmin)) {
      return res.status(404).render("pages/404", {
        title: "Post Not Found",
        user: req.user,
        layout: "layouts/main",
      });
    }

    const imageUrl = post.blogImage
      ? post.blogImage.startsWith("/uploads")
        ? post.blogImage
        : `/uploads/images/${post.blogImage}`
      : null;

    const pdfUrl = post.pdf
      ? post.pdf.startsWith("/uploads")
        ? post.pdf
        : `/uploads/pdfs/${post.pdf}`
      : null;

    res.render("pages/blogpage", {
      post,
      imageUrl,
      pdfUrl,
      title: post.title,
      user: req.user,
      layout: "layouts/main",
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).render("error", {
      message: "Error fetching post",
      user: req.user,
    });
  }
}

// ============================
// 📄 Direct PDF Download (Admin use)
// ============================
async function downloadPDF(req, res) {
  try {
    const post = await Post.findById(req.params.id);

    if (!post || !post.pdf) {
      return res.status(404).send("PDF not found");
    }

    // Validate file path to prevent directory traversal
    const filePath = validateFilePath(post.pdf);

    if (!filePath || !fileExists(filePath)) {
      return res.status(404).send("PDF file not found on server");
    }

    return res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error("Error during download:", err);
        if (!res.headersSent) {
          res.status(500).send("Error downloading PDF");
        }
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    if (!res.headersSent) {
      return res.status(500).send("Internal server error");
    }
  }
}

// ============================
// ⏳ Generate Temporary Download Link (valid for 1 hour)
// ============================
async function generatePDFDownloadLink(req, res) {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to download resources.",
      });
    }

    console.log("📝 Generate link request for ID:", req.params.id);
    console.log("👤 Requested by user:", req.user.email || req.user.name);
    
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log("❌ Invalid ID format");
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    const post = await Post.findById(id);
    console.log("📄 Post found:", post ? "Yes" : "No");
    
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (!post.pdf) {
      return res.status(404).json({
        success: false,
        message: "No PDF attached to this post",
      });
    }

    console.log("📎 PDF path:", post.pdf);

    // Validate file exists on filesystem
    let filePath;
    try {
      filePath = validateFilePath(post.pdf);
      console.log("✅ Validated file path:", filePath);
    } catch (pathError) {
      console.error("❌ Path validation error:", pathError.message);
      return res.status(400).json({
        success: false,
        message: "Invalid file path",
      });
    }

    if (!filePath || !fileExists(filePath)) {
      console.log("❌ File does not exist on server");
      return res.status(404).json({
        success: false,
        message: "PDF file not found on server",
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + TOKEN_EXPIRY;

    activeDownloadTokens.set(token, { postId: id, expiresAt });
    console.log("🔑 Token generated:", token.substring(0, 10) + "...");

    // Generate download URL with correct prefix
    // Check if we're using /api prefix by looking at the original URL
    const routePrefix = req.originalUrl.includes('/api/') ? '/api' : '';
    const downloadURL = `${req.protocol}://${req.get("host")}${routePrefix}/download-temp/${token}`;
    console.log("🔗 Download URL:", downloadURL);

    return res.json({
      success: true,
      message: "Temporary download link generated",
      downloadURL,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("❌ Error generating link:", error);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error",
      ...(process.env.NODE_ENV === 'development' && { error: error.toString() })
    });
  }
}

// ============================
// 🕒 Verify Token and Download PDF
// ============================
async function verifyAndDownloadPDF(req, res) {
  try {
    const { token } = req.params;
    const tokenData = activeDownloadTokens.get(token);

    if (!tokenData) {
      return res.status(403).send("Invalid or expired download link");
    }

    if (Date.now() > tokenData.expiresAt) {
      activeDownloadTokens.delete(token);
      return res.status(403).send("Download link expired");
    }

    const post = await Post.findById(tokenData.postId);
    if (!post || !post.pdf) {
      return res.status(404).send("PDF not found");
    }

    // Validate file path and existence
    const filePath = validateFilePath(post.pdf);
    if (!filePath || !fileExists(filePath)) {
      return res.status(404).send("PDF file not found on server");
    }

    // Optional: Delete token after use (one-time download)
    // activeDownloadTokens.delete(token);

    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error("Error downloading:", err);
        if (!res.headersSent) {
          return res.status(500).send("Error downloading file");
        }
      }
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    if (!res.headersSent) {
      return res.status(500).send("Internal Server Error");
    }
  }
}

// ============================
// 🧩 Export Controller
// ============================
module.exports = {
  upload,
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostsByStatus,
  getCreatePostPage,
  getPublishedPosts,
  getPostBySlug,
  downloadPDF,
  generatePDFDownloadLink,
  verifyAndDownloadPDF,
};