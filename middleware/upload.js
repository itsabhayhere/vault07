const multer = require("multer");
const path = require("path");

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/pdfs/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + path.extname(file.originalname);
    const safeTitle = req.body.title
      ? req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")
      : "file";
    cb(null, `${safeTitle}-${uniqueSuffix}`);
  },
});

// File filter — only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
