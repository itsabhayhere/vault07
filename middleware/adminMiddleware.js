const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    // Check if user is already set and has admin role
    if (req.user && req.user.role === 'admin') {
      console.log("✅ Admin access granted:", req.user.email || req.user._id);
      return next();
    }

    // Try to get token manually
    const token = req.cookies.auth_token;

    if (!token) {
      console.log("❌ Admin access denied - No token");
      return res.status(403).render("errors/403", {
        title: "403 - Forbidden",
        message: "You must be logged in as an administrator to access this page.",
        user: null,
      });
    }

    // Verify token and fetch full user
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log("❌ Admin access denied - User not found");
      return res.status(403).render("errors/403", {
        title: "403 - Forbidden",
        message: "User account not found. Please log in again.",
        user: null,
      });
    }

    if (user.role !== "admin") {
      console.log("❌ Admin access denied - Not admin:", user.email);
      return res.status(403).render("errors/403", {
        title: "403 - Forbidden",
        message: "You do not have administrator privileges. This area is restricted.",
        user: user,
      });
    }

    req.user = user;
    console.log("✅ Admin access granted:", user.email);
    next();
    
  } catch (err) {
    console.error("❌ Admin middleware error:", err.message);
    return res.status(403).render("errors/403", {
      title: "403 - Forbidden",
      message: "Invalid authentication. Please log in again.",
      user: null,
    });
  }
};