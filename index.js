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
const Setting = require("./models/Setting");

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

// ===== MongoDB Connection (FIXED - No deprecation warnings) =====
mongoose.connect(config.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// ===== Attach user globally (silent check) =====
app.use(checkAuthToken); // Silently checks token, doesn't log

app.use((req, res, next) => {
  res.locals.user = req.user || null; // ✅ Makes user available in all EJS files
  next();
});

// ===== Load common data globally (recent posts + marquees + settings) =====
app.use(async (req, res, next) => {
  try {
    const recentPost = await Post.find({}).sort({ createdAt: -1 }).limit(10);
    const marquees = await Marquee.find({});
    let settings = await Setting.findOne();

    // If no settings exist, create default
    if (!settings) {
      settings = await Setting.create({
        siteName: "Vault01",
        contactEmail: "",
        facebookUrl: "",
        instagramUrl: "",
        twitterUrl: "",
        linkedinUrl: "",
        address: "",
      });
    }

    res.locals.recentPost = recentPost;
    res.locals.marquees = marquees;
    res.locals.settings = settings;
    res.locals.title = settings.siteName || "Vault01";

    next();
  } catch (err) {
    console.error("❌ Error loading global data:", err.message);

    res.locals.recentPost = [];
    res.locals.marquees = [];
    res.locals.settings = {
      siteName: "Vault01",
      contactEmail: "",
      facebookUrl: "",
      instagramUrl: "",
      twitterUrl: "",
      linkedinUrl: "",
      address: ""
    };

    res.locals.title = "Vault01";
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
const settingsRouter = require("./routes/settingsRoutes");
const fileUploadRouter = require("./routes/fileUploadRoute");

// Public routes
app.use("/", indexRouter);
app.use("/about", aboutRouter);
app.use("/courses", coursesRouter);
app.use("/api", postRoutes);

// Protected admin routes
app.use("/admin/category", adminMiddleware, categoryRouter);
app.use("/admin/products", adminMiddleware, productRouter);
app.use("/admin/marquee", adminMiddleware, marqueeRouter);
app.use("/admin/settings", adminMiddleware, settingsRouter);
app.use("/admin/files", adminMiddleware, fileUploadRouter); // ✅ Only define once
app.use("/admin", adminMiddleware, adminRouter);

// ===== Static Pages =====
app.get("/contact", (req, res) => {
  res.render("pages/contactus", { title: "Contact" });
});

// ===== Server Start =====
app.listen(config.PORT, () => {
  console.log(`✅ Server is running on http://localhost:${config.PORT}`);
});

