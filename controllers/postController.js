const crypto = require("crypto");
const Post = require("../models/Post");
const Download = require("../models/Download");
const slugify = require("slugify");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================
// 📁 Constants
// ============================
const UPLOAD_DIRS = {
  PDF: "uploads/pdfs",
  ZIP: "uploads/zips",
  IMAGE: "uploads/images",
  OTHER: "uploads/others",
};

const ALLOWED_FILE_TYPES = {
  PDF: ["application/pdf"],
  ZIP: ["application/zip", "application/x-zip-compressed"],
  IMAGE: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
};

const FILE_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour
const TOKEN_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_TITLE_LENGTH = 200;
const ALLOWED_STATUSES = ["draft", "published", "archived"];
const DAILY_DOWNLOAD_LIMIT = 5;

// ============================
// 🧠 In-memory Token Store with Auto-cleanup
// ============================
const activeDownloadTokens = new Map();

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
function validateFilePath(filePath, baseDir = "uploads") {
  if (!filePath) return null;
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(__dirname, "..", normalizedPath);
  const basePath = path.join(__dirname, "..", baseDir);
  if (!fullPath.startsWith(basePath)) {
    throw new Error("Invalid file path");
  }
  return fullPath;
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function isValidStatus(status) {
  return ALLOWED_STATUSES.includes(status);
}

function sanitizeTitle(title) {
  return title.trim().substring(0, MAX_TITLE_LENGTH);
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress;
}

// ============================
// 📁 Multer Configuration
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir = UPLOAD_DIRS.OTHER;
    if (file.mimetype === "application/pdf") {
      uploadDir = UPLOAD_DIRS.PDF;
    } else if (ALLOWED_FILE_TYPES.ZIP.includes(file.mimetype)) {
      uploadDir = UPLOAD_DIRS.ZIP;
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
    ...ALLOWED_FILE_TYPES.ZIP,
    ...ALLOWED_FILE_TYPES.IMAGE,
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, ZIP, or image files are allowed"), false);
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

    const postStatus = status || "draft";
    if (!isValidStatus(postStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(", ")}`,
      });
    }

    const slug = slugify(sanitizedTitle, { lower: true, strict: true });

    const pdfPath = req.files?.pdf
      ? `/uploads/pdfs/${req.files.pdf[0].filename}`
      : null;
    
    const zipPath = req.files?.zip
      ? `/uploads/zips/${req.files.zip[0].filename}`
      : null;
    
    const imagePath = req.files?.image
      ? `/uploads/images/${req.files.image[0].filename}`
      : null;

    const newPost = new Post({
      title: sanitizedTitle,
      slug,
      content,
      pdf: pdfPath,
      zip: zipPath,
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

    if (req.files?.pdf) {
      updateData.pdf = `/uploads/pdfs/${req.files.pdf[0].filename}`;
    }
    if (req.files?.zip) {
      updateData.zip = `/uploads/zips/${req.files.zip[0].filename}`;
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

    try {
      if (deletedPost.pdf) {
        const pdfPath = validateFilePath(deletedPost.pdf);
        if (pdfPath && fileExists(pdfPath)) {
          fs.unlinkSync(pdfPath);
        }
      }
      if (deletedPost.zip) {
        const zipPath = validateFilePath(deletedPost.zip);
        if (zipPath && fileExists(zipPath)) {
          fs.unlinkSync(zipPath);
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

    const zipUrl = post.zip
      ? post.zip.startsWith("/uploads")
        ? post.zip
        : `/uploads/zips/${post.zip}`
      : null;

    // Check daily download limit if user is logged in
    let downloadStatus = { count: 0, remaining: 5, limitReached: false };
    if (req.user) {
      try {
        downloadStatus = await Download.checkDailyLimit(req.user._id);
      } catch (err) {
        console.error("Error checking download limit:", err);
      }
    }

    res.render("pages/blogpage", {
      post,
      imageUrl,
      pdfUrl,
      zipUrl,
      downloadStatus,
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
// 📄 Direct File Download (Admin use)
// ============================
async function downloadFile(req, res) {
  try {
    const post = await Post.findById(req.params.id);
    const fileType = req.params.type; // 'pdf' or 'zip'

    if (!post) {
      return res.status(404).send("Post not found");
    }

    const filePath = fileType === 'zip' ? post.zip : post.pdf;

    if (!filePath) {
      return res.status(404).send(`${fileType.toUpperCase()} not found`);
    }

    // Validate file path to prevent directory traversal
    const validatedPath = validateFilePath(filePath);

    if (!validatedPath || !fileExists(validatedPath)) {
      return res.status(404).send("File not found on server");
    }

    return res.download(validatedPath, path.basename(validatedPath), (err) => {
      if (err) {
        console.error("Error during download:", err);
        if (!res.headersSent) {
          res.status(500).send("Error downloading file");
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
// 🔗 NEW: Render Download Page
// ============================
async function getDownloadPage(req, res) {
  try {
    if (!req.user) {
      return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
    }

    const { id, type } = req.params;

    if (!['pdf', 'zip'].includes(type)) {
      return res.status(400).render("error", {
        message: "Invalid file type",
        user: req.user,
      });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render("error", {
        message: "Invalid post ID",
        user: req.user,
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).render("pages/404", {
        title: "Post Not Found",
        user: req.user,
        layout: "layouts/main",
      });
    }

    const filePath = type === 'zip' ? post.zip : post.pdf;
    if (!filePath) {
      return res.status(404).render("error", {
        message: `No ${type.toUpperCase()} file available for this post`,
        user: req.user,
      });
    }

    const downloadStatus = await Download.checkDailyLimit(req.user._id);

    const userDownloads = await Download.find({
      userId: req.user._id,
      postId: id,
      fileType: type,
    })
      .sort({ downloadedAt: -1 })
      .limit(5);

    res.render("pages/download-page", {
      post,
      fileType: type,
      downloadStatus,
      userDownloads,
      title: `Download ${type.toUpperCase()} - ${post.title}`,
      user: req.user,
      layout: "layouts/main",
    });
  } catch (error) {
    console.error("Error loading download page:", error);
    res.status(500).render("error", {
      message: "Error loading download page",
      user: req.user,
    });
  }
}

// ============================
// ⏳ Generate Temporary Download Link
// ============================
async function generateFileDownloadLink(req, res) {
  try {
    // Authentication check
    if (!req.user || !req.user._id) {
      console.log("❌ No user found in request. req.user:", req.user);
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in to download resources.",
      });
    }

    console.log("✅ User authenticated:", req.user.email || req.user._id);

    const { id, type } = req.params;
    
    // Validate file type
    if (!['pdf', 'zip'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type. Must be 'pdf' or 'zip'",
      });
    }
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID format",
      });
    }

    // Check daily download limit
    let limitCheck;
    try {
      limitCheck = await Download.checkDailyLimit(req.user._id);
    } catch (limitError) {
      console.error("Error checking download limit:", limitError);
      return res.status(500).json({
        success: false,
        message: "Error checking download limit. Please try again.",
        error: process.env.NODE_ENV === 'development' ? limitError.message : undefined
      });
    }

    if (limitCheck.limitReached) {
      return res.status(429).json({
        success: false,
        message: `Daily download limit reached. You can download ${DAILY_DOWNLOAD_LIMIT} files per day. Try again tomorrow.`,
        downloadCount: limitCheck.count,
        remaining: limitCheck.remaining,
      });
    }

    // Find post
    let post;
    try {
      post = await Post.findById(id);
    } catch (dbError) {
      console.error("Database error finding post:", dbError);
      return res.status(500).json({
        success: false,
        message: "Database error while finding post",
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Get file path
    const filePath = type === 'zip' ? post.zip : post.pdf;
    if (!filePath) {
      return res.status(404).json({
        success: false,
        message: `No ${type.toUpperCase()} attached to this post`,
      });
    }

    // Validate file path
    let validatedPath;
    try {
      validatedPath = validateFilePath(filePath);
    } catch (pathError) {
      console.error("Path validation error:", pathError);
      return res.status(400).json({
        success: false,
        message: "Invalid file path",
        error: process.env.NODE_ENV === 'development' ? pathError.message : undefined
      });
    }

    // Check if file exists
    if (!validatedPath || !fileExists(validatedPath)) {
      console.error(`File not found: ${validatedPath}`);
      return res.status(404).json({
        success: false,
        message: "File not found on server",
        filePath: process.env.NODE_ENV === 'development' ? validatedPath : undefined
      });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + TOKEN_EXPIRY;

    activeDownloadTokens.set(token, {
      postId: id,
      fileType: type,
      userId: req.user._id.toString(),
      expiresAt,
    });

    // Build download URL
    const protocol = req.protocol;
    const host = req.get("host");
    
    // Since all routes are mounted under /api in app.js
    const downloadURL = `${protocol}://${host}/api/download-temp/${token}`;

    console.log(`✅ Generated download link for user ${req.user.email}: ${downloadURL}`);

    return res.json({
      success: true,
      message: "Temporary download link generated",
      downloadURL,
      fileType: type,
      expiresAt: new Date(expiresAt).toISOString(),
      downloadStatus: limitCheck,
    });
  } catch (error) {
    console.error("❌ Error generating link:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      message: "Server error while generating link",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// ============================
// 🕒 Verify Token and Download File
// ============================
async function verifyAndDownloadFile(req, res) {
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

    if (!req.user || req.user._id.toString() !== tokenData.userId) {
      return res.status(403).send("Unauthorized access");
    }

    const limitCheck = await Download.checkDailyLimit(req.user._id);
    if (limitCheck.limitReached) {
      return res.status(429).send(`Daily download limit (${DAILY_DOWNLOAD_LIMIT}) reached. Try again tomorrow.`);
    }

    const post = await Post.findById(tokenData.postId);
    if (!post) {
      return res.status(404).send("Post not found");
    }

    const filePath = tokenData.fileType === 'zip' ? post.zip : post.pdf;
    if (!filePath) {
      return res.status(404).send("File not found");
    }

    const validatedPath = validateFilePath(filePath);
    if (!validatedPath || !fileExists(validatedPath)) {
      return res.status(404).send("File not found on server");
    }

    // Record download in database
    try {
      const download = new Download({
        userId: req.user._id,
        postId: tokenData.postId,
        fileType: tokenData.fileType,
        fileName: path.basename(validatedPath),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
      await download.save();
      console.log(`✅ Download recorded: ${req.user.email} downloaded ${tokenData.fileType} from post ${tokenData.postId}`);
    } catch (dbError) {
      console.error("Error recording download:", dbError);
    }

    // Delete token after successful use
    activeDownloadTokens.delete(token);

    res.download(validatedPath, path.basename(validatedPath), (err) => {
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
// 📊 NEW: Get User Download History (Admin)
// ============================
async function getUserDownloadHistory(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const history = await Download.getUserHistory(userId, limit);

    res.status(200).json({
      success: true,
      count: history.length,
      downloads: history,
    });
  } catch (error) {
    console.error("Error fetching download history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching download history",
    });
  }
}

// ============================
// 📊 NEW: Get Post Download Stats (Admin)
// ============================
async function getPostDownloadStats(req, res) {
  try {
    const { id } = req.params;
    
    const stats = await Download.getPostStats(id);
    const totalDownloads = await Download.countDocuments({ postId: id });

    res.status(200).json({
      success: true,
      postId: id,
      totalDownloads,
      breakdown: stats,
    });
  } catch (error) {
    console.error("Error fetching post stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching download statistics",
    });
  }
}

// ============================
// 📊 NEW: Check User Daily Limit (API)
// ============================
async function checkUserLimit(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const limitCheck = await Download.checkDailyLimit(req.user._id);

    res.status(200).json({
      success: true,
      ...limitCheck,
      limit: DAILY_DOWNLOAD_LIMIT,
    });
  } catch (error) {
    console.error("Error checking limit:", error);
    res.status(500).json({
      success: false,
      message: "Error checking download limit",
    });
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
  downloadFile,
  getDownloadPage,
  generateFileDownloadLink,
  verifyAndDownloadFile,
  getUserDownloadHistory,
  getPostDownloadStats,
  checkUserLimit,
};