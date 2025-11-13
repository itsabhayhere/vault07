const express = require("express");
const router = express.Router();
const {getCoursePage,getCategoryProductsPage,getProductDetailPage} = require("../controllers/courseController");

// Home route
router.get('/', getCoursePage);
router.get('/category/:slug', getCategoryProductsPage);

router.get('/:categorySlug/:productSlug', getProductDetailPage);

module.exports = router;