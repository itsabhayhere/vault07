const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads/others";

    if (file.mimetype === "application/pdf") folder = "uploads/pdfs";
    else if (file.mimetype.startsWith("image/")) folder = "uploads/images";

    fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    const safeTitle = req.body.title
      ? req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : "file";
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    cb(null, `${safeTitle}-${uniqueSuffix}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only PDF and image files are allowed"), false);
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
