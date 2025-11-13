const express = require("express");
const app = express();
const path = require("path");
const expressLayout = require("express-ejs-layouts");
const mongoose = require("mongoose");
const config = require("./config/config");
const checkAuthToken = require('./middleware/verifyToken');
const adminMiddleware = require("./middleware/adminMiddleware");
const trackVisitor = require("./middleware/trackVisitor");
const methodOverride = require('method-override');
const cookieParser = require("cookie-parser");

const Post = require('./models/Post');
const Marquee = require("./models/Marquee");

// ===== Middleware Setup =====
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// ===== EJS Setup =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));
app.use(expressLayout);
app.set("layout", "layouts/main");

// ===== MongoDB Connection =====
mongoose.connect(config.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// ===== Attach user globally (fixes 'user is not defined') =====
app.use(checkAuthToken); // attaches req.user if token is valid
app.use((req, res, next) => {
  res.locals.user = req.user || null; // ✅ this ensures `user` is defined in all EJS files
  next();
});

// ===== Load common data globally (recent posts + marquees) =====
app.use(async (req, res, next) => {
  try {
    const recentPost = await Post.find({}).sort({ createdAt: -1 }).limit(10);
    const marquees = await Marquee.find({});
    res.locals.recentPost = recentPost;
    res.locals.marquees = marquees;
    res.locals.title = "CourseSell"; // default title
    next();
  } catch (err) {
    console.error(err);
    res.locals.recentPost = [];
    res.locals.marquees = [];
    res.locals.title = "CourseSell";
    next();
  }
});

// ===== Visitor tracking =====
app.use(trackVisitor);

// ===== Routes =====
const indexRouter = require("./routes/index");
const aboutRouter = require("./routes/about");
const coursesRouter = require("./routes/courses");
const adminRouter = require("./routes/adminRoute");
const postRoutes = require("./routes/postRoutes");
const categoryRouter = require("./routes/categoryRoute");
const productRouter = require("./routes/productRoute");
const marqueeRouter = require("./routes/marqueeRoute");

app.use("/", indexRouter);
app.use("/about", aboutRouter);
app.use("/courses", coursesRouter);
app.use("/api", postRoutes);
app.use("/admin/category", adminMiddleware, categoryRouter);
app.use("/admin/products", adminMiddleware, productRouter);
app.use("/admin/marquee", adminMiddleware, marqueeRouter);
app.use("/admin", adminMiddleware, adminRouter);

// ===== Static Pages =====
app.get("/contact", (req, res) => {
  res.render("pages/contactus", { title: "Contact" });
});

// ===== Server Start =====
app.listen(config.PORT, () => {
  console.log(`✅ Server is running on http://localhost:${config.PORT}`);
});
