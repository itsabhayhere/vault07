const Category = require("../../models/Category");
const { body, validationResult } = require("express-validator");
const slugify = require("slugify");

// Get Category Page with Pagination
async function getCategoryPage(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const [categories, totalCategories] = await Promise.all([
      Category.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Category.countDocuments(),
    ]);

    if (categories.length === 0 && page > 1) {
      return res.redirect(`/admin/categories?page=${page - 1}`);
    }

    const totalPages = Math.ceil(totalCategories / limit);

    res.render("admin/category/categoryPage", {
      title: "Category Page",
      user: req.user,
      layout: "admin/adminLayout",
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
}


//create category page
async function getCreateCategoryPage(req, res) {
  res.render("admin/category/createCategory", {
    title: "Create Category",
    user: req.user,
    layout: "admin/adminLayout",
    errors: [],      // pass empty array initially
    oldData: {}      // optional: for repopulating form
  });
}


//create new category
async function createCategory(req, res) {
  try {
    await body("name")
      .trim()
      .notEmpty()
      .withMessage("Category name is required")
      .isLength({ min: 3 })
      .withMessage("Category name must be at least 3 characters long")
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // access data from req
    const { name } = req.body;
    const image = req.file?.path;

    // check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res
        .status(400)
        .json({ errors: [{ msg: "Category with this name already exists" }] });
    }

    const category = new Category({ name, image });
    await category.save();
    res
      .status(201)
      .redirect('/admin/category'); // Redirect to category list page after creation
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).send("Internal Server Error");
  }
}

// GET Edit Category Page
async function getEditCategoryPage(req, res) {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).send("Category not found");
    }

    res.render("admin/category/editCategory", {
      title: "Edit Category",
      user: req.user,
      layout: "admin/adminLayout",
      category,      // pass the category data
      oldData: category, // <-- here we pass oldData to pre-fill the form
      errors: []     // initially no validation errors
    });
  } catch (error) {
    console.error("Error fetching category for edit:", error);
    res.status(500).send("Internal Server Error");
  }
}


//update category
async function updateCategory(req, res) {
  try {
    // Implementation for updating category
    const { id } = req.params;
    //update fields
    await body("name")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Category name must be at least 2 characters long")
      .matches(/^[a-zA-Z0-9\s]+$/)
      .withMessage("Category name must not contain special characters")
      .run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // find category by id and update
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ errors: [{ msg: "Category not found" }] });
    }

    const { name } = req.body;
    if (name && name !== category.name) {
      category.name = name;
      //regenerate slug
      category.slug = slugify(name, { lower: true, strict: true });
    }

    if (req.file) {
      category.image = req.file.path;
    }
    await category.save();
    res.redirect('/admin/category');
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).send("Internal Server Error");
  }
}

async function deleteCategory(req,res){
  try{
    const {id} = req.params;
    const category = await Category.findByIdAndDelete(id);
    if(!category){
      return res.status(404).json({errors : [{msg : "Category not found"}]});
    }
    res.redirect('/admin/category');
  }catch(error){
    console.error("Error deleting category:", error);
    res.status(500).send("Internal Server Error");
  }
}

module.exports = { 
  getCategoryPage, 
  createCategory,
  updateCategory,
  getCreateCategoryPage,
  getEditCategoryPage,
  deleteCategory
};
