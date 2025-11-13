const Category = require('../models/Category');
const Product = require('../models/Product');
async function getCoursePage(req, res) {
  try {
    // Fetch all categories from MongoDB
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render('pages/courses', { 
      title: 'Courses',
      user: req.user,  // Pass user info to the template
      categories       // Pass categories to the template
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).send('Internal Server Error');
  }
}


async function getCategoryProductsPage(req, res) {
    try {
      const { slug } = req.params;
  
      // Find category by slug
      const category = await Category.findOne({ slug });
      if (!category) {
        return res.status(404).send('Category not found');`8`
      }
  
      // Find products that belong to this category
      const products = await Product.find({ category: category._id }).sort({ createdAt: -1 });
      res.render('pages/catergoryProduct', {
        title: `${category.name} Courses`,
        user: req.user,
        category,
        products
      });
    } catch (error) {
      console.error('Error fetching category products:', error);
      res.status(500).send('Internal Server Error');
    }
  }


async function getProductDetailPage(req, res) {
    try {
      const { categorySlug, productSlug } = req.params;
  
      // Find category first (optional validation)
      const category = await Category.findOne({ slug: categorySlug });
      if (!category) {
        return res.status(404).send('Category not found');
      }
  
      // Find product by slug and category
      const product = await Product.findOne({ slug: productSlug, category: category._id });
      if (!product) {
        return res.status(404).send('Product not found');
      }
  
      // Render product detail page
      res.render('pages/productpage', {
        title: product.name,
        user: req.user,
        product,
        category
      });
    } catch (error) {
      console.error('Error fetching product detail:', error);
      res.status(500).send('Internal Server Error');
    }
  }
  



module.exports = { getCoursePage,getCategoryProductsPage,getProductDetailPage };
