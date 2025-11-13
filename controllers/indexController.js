const Post = require('../models/Post');

async function getHomePage(req, res) {
  try {
    const posts = await Post.find({}).sort({ createdAt: -1 });
    res.render('pages/index', {
      title: 'Home',
      posts,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}

module.exports = { getHomePage };
