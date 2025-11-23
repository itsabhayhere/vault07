const express = require("express");
const router = express.Router();

const PostCategory = require("../models/PostCategory");
const adminMiddleware = require("../middleware/adminMiddleware");

// =====================================
// 🟦 CREATE NEW POST CATEGORY (Admin)
// =====================================
router.post("/admin/post-category", adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await PostCategory.create({ name });

    return res.status(201).json({
      success: true,
      message: "Category created successfully!",
      category,
    });
  } catch (err) {
    console.error("Error creating category:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating category",
    });
  }
});

// =====================================
// 🟩 GET ALL CATEGORIES (Admin)
// =====================================
router.get("/admin/post-category", adminMiddleware, async (req, res) => {
  try {
    const categories = await PostCategory.find().sort({ name: 1 });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (err) {
    console.error("Error fetching categories:", err);

    return res.status(500).json({
      success: false,
      message: "Error fetching categories",
    });
  }
});

// =====================================
// 🟧 DELETE CATEGORY (Optional Admin)
// =====================================
router.delete("/admin/post-category/:id", adminMiddleware, async (req, res) => {
  try {
    const deleted = await PostCategory.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting category:", err);

    return res.status(500).json({
      success: false,
      message: "Error deleting category",
    });
  }
});

module.exports = router;
