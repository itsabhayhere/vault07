const jwt = require('jsonwebtoken');
const config = require('../config/config');

const checkAuthToken = async (req, res, next) => {
  try {
    const token = req.cookies.auth_token || req.headers["authorization"]?.replace("Bearer ", "");
    
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Set user info from token (will be enhanced by other middleware if needed)
    req.user = {
      _id: decoded.userId || decoded.id || decoded._id,
      userId: decoded.userId || decoded.id || decoded._id, // Keep both for compatibility
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = checkAuthToken;
