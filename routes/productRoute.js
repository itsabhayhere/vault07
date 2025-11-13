const express = require('express');
const router = express.Router();
const multer = require('multer');
const productController = require('../controllers/adminController/productController');
const upload = require('../middleware/uploadImage');

//route to get products page
router.get('/', productController.getProductPage);
// Route to create a new product with image upload
router.post('/create', upload.single('image'), productController.creationProduct);
//Route to update a product with image upload
router.put('/update/:id', upload.single('image'), productController.updateProductbyId);
// Route to delete a product by ID
router.delete('/delete/:id', productController.deleteProduct);
module.exports = router