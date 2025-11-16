// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/adminController/fileController');

// ============================
// VIEW ROUTES
// ============================

// Upload page
router.get('/', fileController.getUploadPage);

// Browse page
router.get('/browse', fileController.getBrowsePage);

// ============================
// UPLOAD ROUTE
// ============================

// Handle file upload - IMPORTANT: 'zipFile' must match the input name in the form
router.post('/upload', (req, res, next) => {
    console.log('📥 Upload route hit');
    console.log('Body before multer:', req.body);
    next();
}, fileController.upload.single('zipFile'), (err, req, res, next) => {
    // Error handling middleware for multer
    if (err) {
        console.error('❌ Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.redirect('/admin/files?error=' + encodeURIComponent('File size exceeds 100MB limit'));
        }
        return res.redirect('/admin/files?error=' + encodeURIComponent(err.message));
    }
    next();
}, fileController.handleFileUpload);

// ============================
// DELETE ROUTES
// ============================

// Delete file
router.delete('/delete/:category/:folder/:filename', fileController.deleteFile);

// Delete folder
router.delete('/delete-folder/:category/:folder', fileController.deleteFolder);

// Delete category
router.delete('/delete-category/:category', fileController.deleteCategory);

// ============================
// RENAME/EDIT ROUTES
// ============================

// Rename category
router.put('/rename-category/:category', fileController.renameCategory);

// Rename folder
router.put('/rename-folder/:category/:folder', fileController.renameFolder);

// Rename file
router.put('/rename-file/:category/:folder/:filename', fileController.renameFile);

// ============================
// API ROUTES (JSON)
// ============================

// Get all categories
router.get('/api/categories', fileController.getCategoriesAPI);

// Get folders in a category
router.get('/api/folders/:category', fileController.getFoldersAPI);

// Get files in a folder
router.get('/api/files/:category/:folder', fileController.getFilesAPI);

module.exports = router;