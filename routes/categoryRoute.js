const express = require("express");
const router = express.Router();
const { createCategory, 
        updateCategory,
        getCategoryPage,
        getCreateCategoryPage,
        getEditCategoryPage,
        deleteCategory} = require("../controllers/adminController/categoryController");

const upload = require("../middleware/uploadImage"); // our new middleware

//get all categories
router.get('/' ,getCategoryPage);
//get create category page
router.get('/create',getCreateCategoryPage);
// Route for creating category with image upload
router.post("/create", upload.single("image"), createCategory);
//route to get edit page 
router.get("/edit/:id",getEditCategoryPage);
// categoryRoute.js
router.put("/update/:id", upload.single("image"), updateCategory);
//delete category
router.delete('/delete/:id',deleteCategory)



module.exports = router;
