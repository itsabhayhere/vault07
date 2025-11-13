const express = require("express");
const app = express();
const path = require("path");
const expressLayout = require("express-ejs-layouts");
const mongoose = require("mongoose");
const config = require("./config/config");
// const jwt = require("jsonwebtoken");
const checkAuthToken = require('./middleware/verifyToken');  // Import the token checking middleware
const adminMiddleware = require("./middleware/adminMiddleware");
const trackVisitor = require("./middleware/trackVisitor");

const methodOverride = require('method-override');

const cookieParser = require("cookie-parser"); // Add this line
app.use(cookieParser()); // Add this line

// 🧩 Connect to MongoDB
mongoose
  .connect(config.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// Middleware

app.use(checkAuthToken);  // Check for the token and attach user info

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// EJS Template Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static Files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));

// EJS Layouts
app.use(expressLayout);
app.set("layout", "layouts/main");

app.use(methodOverride('_method'));
// app.js (before routes)
const Post = require('./models/Post');

app.use(async (req, res, next) => {
  try {
    const recentPost = await Post.find({}).sort({ createdAt: -1 }).limit(10);
    const marquees = await Marquee.find({});
    res.locals.recentPost = recentPost; // ✅ available in layouts and views
    res.locals.marquees = marquees;
    next();
  } catch (err) {
    console.error(err);
    res.locals.recentPost = [];
    res.locals.marquees = [];
    next();
  }
});
app.use((req, res, next) => {
  res.locals.title = "CourseSell"; // default title for all pages
  next();
});
app.use(trackVisitor);


// ✅ Load all routes first
const indexRouter = require("./routes/index");
const aboutRouter = require("./routes/about");
const coursesRouter = require("./routes/courses");
const adminRouter = require("./routes/adminRoute");
const postRoutes = require("./routes/postRoutes");
const categoryRouter = require("./routes/categoryRoute");
const productRouter = require("./routes/productRoute");
const marqueeRouter = require("./routes/marqueeRoute");
const Marquee = require("./models/Marquee");

// ✅ Public routes
app.use("/", indexRouter);
app.use("/about", aboutRouter);
app.use("/courses", coursesRouter);
app.use("/api", postRoutes);
app.use("/admin/category", adminMiddleware, categoryRouter);
app.use("/admin/products", adminMiddleware, productRouter);
app.use("/admin/marquee", adminMiddleware, marqueeRouter);

// ✅ Protect only after admin login route
app.use("/admin", adminMiddleware, adminRouter);

// Static Pages
app.get("/contact", (req, res) => {
  res.render("pages/contactus", { title: "Contact", user : req.user });
});


// app.get("/blog", (req, res) => {
//   res.render("pages/blogpage", { title: "Blog" ,user : req.user});
// });


// Server Start
app.listen(config.PORT, () => {
  console.log(`✅ Server is running on http://localhost:${config.PORT}`);
});
