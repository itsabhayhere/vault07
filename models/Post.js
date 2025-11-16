const mongoose = require("mongoose");
const slugify = require("slugify");

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    blogImage: {
      type: String, // will store image URL or file path
    },
    pdf: {
      type: String, // will store the uploaded PDF file path
    },
    zip: {
      type: String, // will store the uploaded ZIP file path
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
  },
  {
    timestamps: true,
  }
);

postSchema.pre("save", async function (next) {
  if (this.isModified("title")) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let count = 1;

    // ensure uniqueness
    while (await mongoose.models.Post.findOne({ slug })) {
      slug = `${baseSlug}-${count++}`;
    }

    this.slug = slug;
  }
  next();
});

const Post = mongoose.model("Post", postSchema);
module.exports = Post;