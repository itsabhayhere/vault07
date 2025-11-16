const express = require("express");
const router = express.Router();
// const nodemailer = require("nodemailer");
const { EMAIL_USER, EMAIL_PASS } = require("../config/config");

const { getHomePage } = require("../controllers/indexController");
const {
  getRegisterPage,
  registerUser,
  verifyOtpPage,
  verifyOtp,
  getLoginPage, 
  loginUser, 
  logoutUser,
  getForgotPasswordPage,
  requestPasswordReset,
  getResetPasswordPage,
  resetPassword
} = require("../controllers/auth/authController");



// Home route
router.get("/", getHomePage);

// Register routes
router.get("/register", getRegisterPage); // Renders the registration page
router.post("/register", registerUser); // Handles registration and sends OTP

// OTP verification routes
router.get("/verify", verifyOtpPage); // Renders the OTP verification page
router.post("/verify", verifyOtp); // Verifies the OTP and registers the user

// Login routes
router.get("/login", getLoginPage); // Renders the login page
router.post("/login", loginUser); // Handles login process

// Logout route
router.get("/logout", logoutUser); // Logs the user out and redirects to login
// Forgot Password Routes
router.get("/forgot-password", getForgotPasswordPage);
router.post("/forgot-password", requestPasswordReset);
router.get("/reset-password", getResetPasswordPage);
router.post("/reset-password", resetPassword);

module.exports = router;
