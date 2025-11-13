const User= require('../../models/User')
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Visitor = require("../../models/Visitor");
const Post = require("../../models/Post")

// ============================
// 📊 Admin Dashboard
// ============================

async function getAdminDashboard(req, res) {
  try {
    // -------------------------
    // Stats
    // -------------------------
    const totalPosts = await Post.countDocuments();
    const drafts = await Post.countDocuments({ status: "draft" });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // -------------------------
    // Recent Visitors
    // -------------------------
    const visitors = await Visitor.find()
      .sort({ visitedAt: -1 })
      .limit(50);

    // -------------------------
    // Render Dashboard
    // -------------------------
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      user: req.user,
      stats: { totalPosts, drafts, newUsers },
      visitors,
      layout: "admin/adminLayout",
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.render("admin/dashboard", {
      title: "Admin Dashboard",
      user: req.user,
      stats: { totalPosts: 0, drafts: 0,  newUsers: 0 },
      visitors: [],
      layout: "admin/adminLayout",
    });
  }
}

// ============================
// 👥 Get All Users (Admin)
// ============================
async function getAllUsers(req, res) {
  try {
    const { role, verified, search, page = 1, limit = 10 } = req.query;

    // Build filter query
    const filter = {};
    if (role) filter.role = role;
    if (verified !== undefined) filter.isVerified = verified === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const totalUsers = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password -otp") // Exclude sensitive fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalPages = Math.ceil(totalUsers / limit);

    res.render("admin/users/user", {
      title: "User Management",
      user: req.user,
      users,
      currentPage: parseInt(page),
      totalPages,
      totalUsers,
      layout: "admin/adminLayout",
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).render("error", {
      message: "Error loading users",
      user: req.user,
    });
  }
}

// ============================
// 🔍 Get Single User by ID (Admin)
// ============================
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
    });
  }
}

// ============================
// 📝 Create New User (Admin)
// ============================
async function createUser(req, res) {
  try {
    const { name, email, password, role, isVerified } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Validate role
    if (role && !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'user' or 'admin'",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "user",
      isVerified: isVerified === true || isVerified === "true",
    });

    await newUser.save();

    // Remove sensitive data before sending response
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.otp;

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating user",
    });
  }
}

// ============================
// ✏️ Update User (Admin)
// ============================
async function updateUser(req, res) {
  try {
    const { name, email, role, isVerified, password } = req.body;
    const userId = req.params.id;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prepare update data
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (email) {
      // Check if email is already taken by another user
      const emailExists = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
      updateData.email = email.toLowerCase().trim();
    }

    if (role) {
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Must be 'user' or 'admin'",
        });
      }
      updateData.role = role;
    }

    if (isVerified !== undefined) {
      updateData.isVerified = isVerified === true || isVerified === "true";
    }

    // Update password if provided
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -otp");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating user",
    });
  }
}

// ============================
// 🗑️ Delete User (Admin)
// ============================
async function deleteUser(req, res) {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user && req.user._id.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting user",
    });
  }
}

// ============================
// 🔄 Toggle User Verification (Admin)
// ============================
async function toggleUserVerification(req, res) {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Toggle verification
    user.isVerified = !user.isVerified;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isVerified ? "verified" : "unverified"} successfully`,
      isVerified: user.isVerified,
    });
  } catch (error) {
    console.error("Error toggling verification:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating verification status",
    });
  }
}

// ============================
// 🔄 Change User Role (Admin)
// ============================
async function changeUserRole(req, res) {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!role || !["user", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'user' or 'admin'",
      });
    }

    // Prevent admin from demoting themselves
    if (req.user && req.user._id.toString() === userId && role === "user") {
      return res.status(403).json({
        success: false,
        message: "You cannot change your own role",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `User role changed to ${role} successfully`,
      user,
    });
  } catch (error) {
    console.error("Error changing role:", error);
    return res.status(500).json({
      success: false,
      message: "Error changing user role",
    });
  }
}

// ============================
// 🔐 Reset User Password (Admin)
// ============================
async function resetUserPassword(req, res) {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword, otp: null },
      { new: true }
    ).select("-password -otp");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      success: false,
      message: "Error resetting password",
    });
  }
}

// ============================
// 📊 Get User Statistics (Admin)
// ============================
async function getUserStatistics(req, res) {
  try {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const unverifiedUsers = await User.countDocuments({ isVerified: false });
    const adminUsers = await User.countDocuments({ role: "admin" });
    const regularUsers = await User.countDocuments({ role: "user" });

    // Users registered in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    return res.status(200).json({
      success: true,
      statistics: {
        totalUsers,
        verifiedUsers,
        unverifiedUsers,
        adminUsers,
        regularUsers,
        recentUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching user statistics",
    });
  }
}

// ============================
// 🔍 Search Users (Admin)
// ============================
async function searchUsers(req, res) {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
    })
      .select("-password -otp")
      .limit(20)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json({
      success: false,
      message: "Error searching users",
    });
  }
}

// ============================
// 📤 Export Functions
// ============================
module.exports = {
  getAdminDashboard,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserVerification,
  changeUserRole,
  resetUserPassword,
  getUserStatistics,
  searchUsers,
};