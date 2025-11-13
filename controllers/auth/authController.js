const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../../models/User");
const { EMAIL_USER, EMAIL_PASS, JWT_SECRET } = require("../../config/config");

let pendingUsers = {}; // Temporary storage for pending users (OTP verification)

// 🧩 Render Register Page
function getRegisterPage(req, res) {
  res.render("pages/auth/register", {
    title: "Register",
    errorMessage: null,
    successMessage: null,
    user: req.user || null, // Pass the user if logged in, or null if not

  });
}

// 📨 Handle Registration — generate OTP & send email
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

    // Check if already registered
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
    const expiry = Date.now() + 1 * 60 * 1000; // 10 minutes expiry

    // Temporarily store the data
    pendingUsers[email] = {
      name,
      email,
      password: hashedPassword,
      otp,
      expiry,
    };

    // Configure mail transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"CourseSell" <${EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Verification Code",
      html: `
        <h2>Welcome, ${name}!</h2>
        <p>Use the following OTP to verify your account:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in <b>10 minutes</b>.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email}`);

    // Redirect to verify page
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

    // Check OTP expiry
    if (Date.now() > pending.expiry) {
      delete pendingUsers[email];
      return res.render("pages/auth/verify", {
        title: "Verify Account",
        email,
        errorMessage: "OTP expired. Please register again.",
        successMessage: null,
      });
    }

    // Check OTP match
    if (parseInt(otp) !== pending.otp) {
      return res.render("pages/auth/verify", {
        title: "Verify Account",
        email,
        errorMessage: "Invalid OTP. Please try again.",
        successMessage: null,
      });
    }

    // ✅ Create user now
    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      isVerified: true,
    });
    await user.save();

    // Remove pending data
    delete pendingUsers[email];

    console.log(`✅ User verified: ${email}`);

    // Redirect to login after success
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
  // Assuming you have user data from a session or JWT token
  const user = req.user || null; // Make sure req.user exists if you're using session or JWT

  res.render("pages/auth/login", {
    title: "Login",
    errorMessage: null,
    successMessage: null,
    user: user // Pass user to EJS view
  });
}

// 🔐 Handle Login Submission
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "Both email and password are required.",
        successMessage: null,
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "No account found with this email.",
        successMessage: null,
      });
    }

    // Check if verified
    if (!user.isVerified) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "Please verify your account first.",
        successMessage: null,
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render("pages/auth/login", {
        title: "Login",
        errorMessage: "Incorrect password.",
        successMessage: null,
      });
    }

    // ✅ Sign JWT token
    const payload = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // ✅ Add this line

    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });

    // Send the JWT token as a cookie
    res.cookie("auth_token", token, {
      maxAge: 1000 * 60 * 60,  // Token expiration time (1 hour)
      httpOnly: true,          // Prevent JavaScript access
      secure: process.env.NODE_ENV === "production",  // Use secure cookies in production
    });

    console.log(`✅ Logged in: ${user.email}`);
    return res.redirect("/");  // Redirect to home page after successful login
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
  res.clearCookie("auth_token"); // Clear the JWT cookie
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
