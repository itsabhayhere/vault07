const Product = require("../../models/Product");
const { body, validationResult } = require("express-validator");
const slugify = require("slugify");
const Category  = require("../../models/Category");

//get product page
async function getProductPage(req, res) {
  try {
    const products = await Product.find().populate("category").sort({ createdAt: -1 });
    const categories = await Category.find().sort({ name: 1 }); // for dropdown in create/edit

    res.render("admin/product/productPage", {
      title: "Product Management",
      products,
      categories, // pass categories to template
      user: req.user,
      layout: "admin/adminLayout",
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send("Server Error");
  }
}

// Create a new product
async function creationProduct(req, res) {
  try {
    // Validation
    await body("name").notEmpty().isString().trim().escape().run(req);
    await body("description").optional().isString().trim().escape().run(req);
    await body("eCode").notEmpty().isAlphanumeric().trim().escape().run(req);
    await body("category").notEmpty().isMongoId().withMessage("Select a valid category").run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, eCode, category } = req.body;
    if (!req.file) return res.status(400).json({ errors: [{ msg: "Product image is required" }] });

    const categoryExists = await Category.findById(category);
    if (!categoryExists) return res.status(400).json({ errors: [{ msg: "Category not found" }] });

    const existingProduct = await Product.findOne({ $or: [{ name }, { eCode }] });
    if (existingProduct) return res.status(400).json({ errors: [{ msg: "Product name or eCode exists" }] });

    const product = new Product({
      name,
      description,
      eCode,
      image: req.file.path,
      slug: slugify(name, { lower: true, strict: true }),
      category: categoryExists._id
    });

    await product.save();
    res.status(201).redirect("/admin/products");
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

//update product
async function updateProductbyId(req, res) {
  try {
    const { id } = req.params;

    await body("name").optional().trim().escape().run(req);
    await body("description").optional().trim().escape().run(req);
    await body("eCode").optional().trim().escape().run(req);
    await body("category").optional().isMongoId().withMessage("Select a valid category").run(req);

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, description, eCode, category } = req.body;
    if (name) product.name = name;
    if (description) product.description = description;
    if (eCode) product.eCode = eCode;
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) return res.status(400).json({ message: "Category not found" });
      product.category = categoryExists._id;
    }
    if (req.file) product.image = req.file.path;

    await product.save();
    res.status(200).redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}


//delete product by id
async function deleteProduct(req, res) {
  try {
    //find product by id
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).redirect("/admin/products");
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}

module.exports = {
  creationProduct,
  updateProductbyId,
  getProductPage,
  deleteProduct,
};
