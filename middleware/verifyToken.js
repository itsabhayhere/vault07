const jwt = require("jsonwebtoken");
const config = require("../config/config");

module.exports = (req, res, next) => {
  // ✅ Match the cookie name from loginUser
  const token =
    req.cookies.auth_token || req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    req.user = null;
    return next(); // Allow public routes to continue without a token
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded; // Attach user info to req
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    req.user = null;
    next();
  }
};
