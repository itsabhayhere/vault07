const multer = require("multer");
const path = require("path");

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/images/"); // folder to store category images
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    const safeName = req.body.name
      ? req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : "image";
    cb(null, `${safeName}-${uniqueSuffix}`);
  },
});

// File filter — only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png, webp)"), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

module.exports = upload;
