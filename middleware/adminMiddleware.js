const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/config");

module.exports = (req, res, next) => {
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(403).render("errors/403", {
      title: "403 - Forbidden",
      message: "You are not authorized to view this page.",
      user: null,
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).render("errors/403", {
        title: "403 - Forbidden",
        message: "You are not authorized to view this page.",
        user: decoded,
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).render("errors/403", {
      title: "403 - Forbidden",
      message: "You are not authorized to view this page.",
      user: null,
    });
  }
};
