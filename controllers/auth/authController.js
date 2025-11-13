const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { JWT_SECRET } = require("../../config/config");
const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

let pendingUsers = {}; // Temporary storage for pending users (OTP verification)

// 🧩 Render Register Page
function getRegisterPage(req, res) {
  res.render("pages/auth/register", {
    title: "Register",
    errorMessage: null,
    successMessage: null,
    user: req.user || null,
  });
}

// 📨 Handle Registration — generate OTP & send email using Resend
async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.render("pages/auth/register", {
        title: "Register",
        errorMessage: "All fields are required!",
        successMessage: null,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("pages/auth/register", {
        title: "Register",
        errorMessage: "Email already registered!",
        successMessage: null,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    pendingUsers[email] = {
      name,
      email,
      password: hashedPassword,
      otp,
      expiry,
    };

    // 📨 Send OTP using Resend
    await resend.emails.send({
      from: "Vault01 <onboarding@resend.dev>", // ✅ works out of the box
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Welcome, ${name}!</h2>
          <p>Use the following OTP to verify your account:</p>
          <h1 style="color: #4CAF50;">${otp}</h1>
          <p>This OTP will expire in <b>10 minutes</b>.</p>
          <p>Best regards,<br>CourseSell Team</p>
        </div>
      `,
    });

    console.log(`✅ OTP sent to ${email}`);

    return res.redirect(`/verify?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    return res.render("pages/auth/register", {
      title: "Register",
      errorMessage: "Failed to send OTP. Try again later.",
      successMessage: null,
    });
  }
}

// 🧾 Render OTP Verification Page
function verifyOtpPage(req, res) {
  const email = req.query.email || "";
  res.render("pages/auth/verify", {
    title: "Verify Account",
    email,
    errorMessage: null,
    successMessage: null,
  });
}

// 🔐 Handle OTP Verification
async function verifyOtp(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.render("pages/auth/verify", {
        title: "Verify Account",
        email,
        errorMessage: "Please enter both email and OTP.",
        successMessage: null,
      });
    }

    const pending = pendingUsers[email];
    if (!pending) {
      return res.render("pages/auth/verify", {
        title: "Verify Account",
        email,
        errorMessage: "No pending registration found or OTP expired.",
        successMessage: null,
      });
    }

    if (Date.now() > pending.expiry) {
      delete pendingUsers[email];
      return res.render("pages/auth/verify", {
        title: "Verify Account",
        email,
        errorMessage: "OTP expired. Please register again.",
        successMessage: null,
      });
    }

    if (parseInt(otp) !== pending.otp) {
      return res.render("pages/auth/verify", {
        title: "Verify Account",
        email,
        errorMessage: "Invalid OTP. Please try again.",
        successMessage: null,
      });
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      isVerified: true,
    });
    await user.save();

    delete pendingUsers[email];

    console.log(`✅ User verified: ${email}`);

    // Optional: Send confirmation email
    await resend.emails.send({
      from: "Vault01 <onboarding@resend.dev>",
      to: email,
      subject: "Your Account Has Been Verified 🎉",
      html: `
        <h2>Welcome aboard, ${pending.name}!</h2>
        <p>Your account has been successfully verified.</p>
        <p>You can now log in and start exploring CourseSell!</p>
      `,
    });

    return res.redirect("/login");
  } catch (error) {
    console.error("❌ OTP verification error:", error.message);
    return res.render("pages/auth/verify", {
      title: "Verify Account",
      errorMessage: "Something went wrong. Please try again.",
      successMessage: null,
    });
  }
}

// ================================ Login
function getLoginPage(req, res) {
  const user = req.user || null;
  res.render("pages/auth/login", {
    title: "Login",
    errorMessage: null,
    successMessage: null,
    user,
  });
}

// 🔐 Handle Login Submission
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "Both email and password are required.",
        successMessage: null,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "No account found with this email.",
        successMessage: null,
      });
    }

    if (!user.isVerified) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "Please verify your account first.",
        successMessage: null,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "Incorrect password.",
        successMessage: null,
      });
    }

    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    res.cookie("auth_token", token, {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });

    console.log(`✅ Logged in: ${user.email}`);
    return res.redirect("/");
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.render("pages/auth/login", {
      title: "Login",
      errorMessage: "Something went wrong. Please try again.",
      successMessage: null,
    });
  }
}

// 🚪 Handle Logout
function logoutUser(req, res) {
  res.clearCookie("auth_token");
  res.redirect("/login");
}

module.exports = {
  getRegisterPage,
  registerUser,
  verifyOtpPage,
  verifyOtp,
  getLoginPage,
  loginUser,
  logoutUser,
};
