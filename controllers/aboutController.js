function getAboutPage(req, res) {
    res.render('pages/about', { title: 'About',
        user: req.user  // Pass user info to the template
     });
}

module.exports = { getAboutPage };