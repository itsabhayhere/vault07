const express = require("express");
const router = express.Router();
const {getAboutPage} = require("../controllers/aboutController");

// Home route
router.get('/', getAboutPage);

module.exports = router;