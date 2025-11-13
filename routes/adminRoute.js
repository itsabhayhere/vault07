const express = require("express");
const router = express.Router();
const { getAdminDashboard ,getAllUsers,getUserStatistics,searchUsers,getUserById,createUser,updateUser,deleteUser,toggleUserVerification,changeUserRole,resetUserPassword} = require("../controllers/adminController/adminController");
const verifyAdmin = require("../middleware/adminMiddleware");

// Note: Add authentication middleware to protect these routes in production!

// ============================
// 🏠 Admin Dashboard
// ============================
router.get("/dashboard",verifyAdmin, getAdminDashboard);

// ============================
// 👥 User Management Routes
// ============================

// Get all users (with filters and pagination)
router.get("/users", getAllUsers);

// Get user statistics
router.get("/users/statistics", getUserStatistics);

// Search users
router.get("/users/search", searchUsers);

// Get single user by ID
router.get("/users/:id", getUserById);

// Create new user
router.post("/users",createUser);

// Update user
router.put("/users/:id", updateUser);

// Delete user
router.delete("/users/:id",deleteUser);

// Toggle user verification
router.patch("/users/:id/verify", toggleUserVerification);

// Change user role
router.patch("/users/:id/role", changeUserRole);

// Reset user password
router.patch("/users/:id/reset-password", resetUserPassword);

module.exports = router;