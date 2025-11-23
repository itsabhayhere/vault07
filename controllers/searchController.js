const Post = require("../models/Post");
const PostCategory = require("../models/PostCategory");

exports.searchPosts = async (req, res) => {
  try {
    const query = req.query.q?.trim();

    if (!query) {
      return res.redirect("/");
    }

    const regex = new RegExp(query, "i"); // Case-insensitive

    const posts = await Post.find({
      status: "published",
      $or: [
        { title: regex },
        { content: regex },
      ]
    }).populate("category");

    const categories = await PostCategory.find();

    res.render("pages/search", {
      title: `Search: ${query}`,
      posts,
      query,
      PostCategory: categories,
      user: req.user,
    });

  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).send("Server Error");
  }
};
