// ===================================
// controllers/fileUploadController.js
// ===================================
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

// Root folder for all uploads
const ROOT_FOLDER = 'zip';

// Get the correct uploads path (go up from controllers folder to root)
const getUploadsPath = (...segments) => {
  return path.join(__dirname, '../../uploads', ...segments);
};

// Ensure root folder exists
const ensureRootFolder = async () => {
  const rootPath = getUploadsPath(ROOT_FOLDER);
  if (!fsSync.existsSync(rootPath)) {
    await fs.mkdir(rootPath, { recursive: true });
  }
  return rootPath;
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      // Multer processes files before body fields are fully parsed
      // So we use a temporary location first
      const tempPath = getUploadsPath(ROOT_FOLDER, 'temp');
      
      // Create temp directory if it doesn't exist
      if (!fsSync.existsSync(tempPath)) {
        fsSync.mkdirSync(tempPath, { recursive: true });
      }
      
      console.log('📁 Temporary upload destination:', tempPath);
      cb(null, tempPath);
    } catch (error) {
      console.error('❌ Destination error:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.originalname;
    console.log('📝 Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.zip') {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed!'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Get all existing categories
const getCategories = async () => {
  try {
    const rootPath = await ensureRootFolder();
    const items = await fs.readdir(rootPath);
    
    const categories = [];
    for (const item of items) {
      const itemPath = path.join(rootPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        categories.push(item);
      }
    }
    
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

// Get folders within a category
const getFoldersInCategory = async (category) => {
  try {
    const categoryPath = getUploadsPath(ROOT_FOLDER, category);
    if (!fsSync.existsSync(categoryPath)) {
      return [];
    }
    
    const items = await fs.readdir(categoryPath);
    const folders = [];
    
    for (const item of items) {
      const itemPath = path.join(categoryPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        // Get files in this folder
        const files = await fs.readdir(itemPath);
        const zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip'));
        folders.push({
          name: item,
          fileCount: zipFiles.length,
          files: zipFiles
        });
      }
    }
    
    return folders;
  } catch (error) {
    console.error('Error getting folders:', error);
    return [];
  }
};

// ============================
// Controller Functions
// ============================

// Display upload form
const getUploadPage = async (req, res) => {
  try {
    const categories = await getCategories();
    res.render('admin/fileUpload', {
      layout: 'admin/adminLayout',
      title: 'Upload ZIP Files',
      categories,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading upload page:', error);
    res.status(500).render('admin/fileUpload', {
      layout: 'layouts/adminLayout',
      title: 'Upload ZIP Files',
      categories: [],
      error: 'Failed to load categories'
    });
  }
};

// Handle file upload
const handleFileUpload = async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('Body:', req.body);
    console.log('File:', req.file);

    if (!req.file) {
      console.log('❌ No file in request');
      return res.redirect('/admin/files?error=' + encodeURIComponent('No file uploaded'));
    }

    const { category, folder_name } = req.body;

    if (!category || !folder_name) {
      console.log('❌ Missing category or folder_name');
      // Delete uploaded file if validation fails
      if (fsSync.existsSync(req.file.path)) {
        await fs.unlink(req.file.path);
      }
      return res.redirect('/admin/files?error=' + encodeURIComponent('Category and folder name are required'));
    }

    // Sanitize folder names
    const sanitizedCategory = category.trim().replace(/[^a-zA-Z0-9-_\s]/g, '_');
    const sanitizedFolder = folder_name.trim().replace(/[^a-zA-Z0-9-_\s]/g, '_');

    // Create final destination path
    const finalPath = getUploadsPath(ROOT_FOLDER, sanitizedCategory, sanitizedFolder);
    
    // Create directory structure
    if (!fsSync.existsSync(finalPath)) {
      fsSync.mkdirSync(finalPath, { recursive: true });
    }

    // Move file from temp to final location
    const finalFilePath = path.join(finalPath, req.file.filename);
    await fs.rename(req.file.path, finalFilePath);

    console.log(`✅ File uploaded successfully: ${req.file.filename}`);
    console.log(`📍 Final location: ${finalFilePath}`);
    console.log(`📂 Category: ${sanitizedCategory}, Folder: ${sanitizedFolder}`);
    
    res.redirect('/admin/files/browse?success=' + encodeURIComponent(`File "${req.file.originalname}" uploaded successfully to ${sanitizedCategory}/${sanitizedFolder}`));
  } catch (error) {
    console.error('❌ Upload error:', error);
    
    // Clean up temp file if it exists
    if (req.file && req.file.path && fsSync.existsSync(req.file.path)) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting temp file:', unlinkError);
      }
    }
    
    res.redirect('/admin/files?error=' + encodeURIComponent(error.message || 'Upload failed'));
  }
};

// Display browse page
const getBrowsePage = async (req, res) => {
  try {
    const categories = await getCategories();
    const categoryData = [];
    
    for (const category of categories) {
      const folders = await getFoldersInCategory(category);
      categoryData.push({
        name: category,
        folders: folders
      });
    }
    
    res.render('admin/fileBrowse', {
      layout: 'admin/adminLayout',
      title: 'Browse Uploaded Files',
      categoryData
    });
  } catch (error) {
    console.error('Browse error:', error);
    res.status(500).render('admin/fileBrowse', {
      layout: 'layouts/adminLayout',
      title: 'Browse Uploaded Files',
      categoryData: [],
      error: 'Failed to load files'
    });
  }
};

// Delete a specific file
const deleteFile = async (req, res) => {
  try {
    const { category, folder, filename } = req.params;
    const filePath = getUploadsPath(ROOT_FOLDER, category, folder, filename);
    
    // Security check - ensure path is within uploads directory
    const rootPath = getUploadsPath(ROOT_FOLDER);
    if (!filePath.startsWith(rootPath)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid file path'
      });
    }
    
    // Check if file exists
    if (!fsSync.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Delete the file
    await fs.unlink(filePath);
    console.log(`✅ File deleted: ${category}/${folder}/${filename}`);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file'
    });
  }
};

// Delete entire folder
const deleteFolder = async (req, res) => {
  try {
    const { category, folder } = req.params;
    const folderPath = getUploadsPath(ROOT_FOLDER, category, folder);
    
    // Security check
    const rootPath = getUploadsPath(ROOT_FOLDER);
    if (!folderPath.startsWith(rootPath)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid folder path'
      });
    }
    
    // Check if folder exists
    if (!fsSync.existsSync(folderPath)) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    // Delete the folder and all contents
    await fs.rm(folderPath, { recursive: true, force: true });
    console.log(`✅ Folder deleted: ${category}/${folder}`);
    
    res.json({
      success: true,
      message: 'Folder deleted successfully'
    });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting folder'
    });
  }
};

// Delete entire category
const deleteCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const categoryPath = getUploadsPath(ROOT_FOLDER, category);
    
    // Security check
    const rootPath = getUploadsPath(ROOT_FOLDER);
    if (!categoryPath.startsWith(rootPath)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid category path'
      });
    }
    
    // Check if category exists
    if (!fsSync.existsSync(categoryPath)) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Delete the category and all contents
    await fs.rm(categoryPath, { recursive: true, force: true });
    console.log(`✅ Category deleted: ${category}`);
    
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category'
    });
  }
};

// ============================
// NEW: Edit/Rename Functions
// ============================

// Rename category
const renameCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { newName } = req.body;
    
    if (!newName || !newName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New name is required'
      });
    }
    
    const sanitizedNewName = newName.trim().replace(/[^a-zA-Z0-9-_\s]/g, '_');
    const oldPath = getUploadsPath(ROOT_FOLDER, category);
    const newPath = getUploadsPath(ROOT_FOLDER, sanitizedNewName);
    
    // Security check
    const rootPath = getUploadsPath(ROOT_FOLDER);
    if (!oldPath.startsWith(rootPath) || !newPath.startsWith(rootPath)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid path'
      });
    }
    
    // Check if old category exists
    if (!fsSync.existsSync(oldPath)) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if new name already exists
    if (fsSync.existsSync(newPath)) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    
    // Rename the category
    await fs.rename(oldPath, newPath);
    console.log(`✅ Category renamed: ${category} → ${sanitizedNewName}`);
    
    res.json({
      success: true,
      message: 'Category renamed successfully',
      newName: sanitizedNewName
    });
  } catch (error) {
    console.error('Rename category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error renaming category'
    });
  }
};

// Rename folder
const renameFolder = async (req, res) => {
  try {
    const { category, folder } = req.params;
    const { newName } = req.body;
    
    if (!newName || !newName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New name is required'
      });
    }
    
    const sanitizedNewName = newName.trim().replace(/[^a-zA-Z0-9-_\s]/g, '_');
    const oldPath = getUploadsPath(ROOT_FOLDER, category, folder);
    const newPath = getUploadsPath(ROOT_FOLDER, category, sanitizedNewName);
    
    // Security check
    const rootPath = getUploadsPath(ROOT_FOLDER);
    if (!oldPath.startsWith(rootPath) || !newPath.startsWith(rootPath)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid path'
      });
    }
    
    // Check if old folder exists
    if (!fsSync.existsSync(oldPath)) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    // Check if new name already exists
    if (fsSync.existsSync(newPath)) {
      return res.status(409).json({
        success: false,
        message: 'A folder with this name already exists'
      });
    }
    
    // Rename the folder
    await fs.rename(oldPath, newPath);
    console.log(`✅ Folder renamed: ${category}/${folder} → ${sanitizedNewName}`);
    
    res.json({
      success: true,
      message: 'Folder renamed successfully',
      newName: sanitizedNewName
    });
  } catch (error) {
    console.error('Rename folder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error renaming folder'
    });
  }
};

// Rename file
const renameFile = async (req, res) => {
  try {
    const { category, folder, filename } = req.params;
    const { newName } = req.body;
    
    if (!newName || !newName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'New name is required'
      });
    }
    
    // Ensure .zip extension
    let sanitizedNewName = newName.trim().replace(/[^a-zA-Z0-9-_\s.]/g, '_');
    if (!sanitizedNewName.toLowerCase().endsWith('.zip')) {
      sanitizedNewName += '.zip';
    }
    
    const oldPath = getUploadsPath(ROOT_FOLDER, category, folder, filename);
    const newPath = getUploadsPath(ROOT_FOLDER, category, folder, sanitizedNewName);
    
    // Security check
    const rootPath = getUploadsPath(ROOT_FOLDER);
    if (!oldPath.startsWith(rootPath) || !newPath.startsWith(rootPath)) {
      return res.status(403).json({
        success: false,
        message: 'Invalid path'
      });
    }
    
    // Check if old file exists
    if (!fsSync.existsSync(oldPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    // Check if new name already exists
    if (fsSync.existsSync(newPath)) {
      return res.status(409).json({
        success: false,
        message: 'A file with this name already exists'
      });
    }
    
    // Rename the file
    await fs.rename(oldPath, newPath);
    console.log(`✅ File renamed: ${category}/${folder}/${filename} → ${sanitizedNewName}`);
    
    res.json({
      success: true,
      message: 'File renamed successfully',
      newName: sanitizedNewName
    });
  } catch (error) {
    console.error('Rename file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error renaming file'
    });
  }
};

// Get categories as JSON
const getCategoriesAPI = async (req, res) => {
  try {
    const categories = await getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get folders in a category
const getFoldersAPI = async (req, res) => {
  try {
    const folders = await getFoldersInCategory(req.params.category);
    res.json({ success: true, folders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get files in a folder
const getFilesAPI = async (req, res) => {
  try {
    const { category, folder } = req.params;
    const folderPath = path.join(__dirname, '../uploads', ROOT_FOLDER, category, folder);
    
    if (!fsSync.existsSync(folderPath)) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }
    
    const files = await fs.readdir(folderPath);
    const zipFiles = files.filter(f => f.toLowerCase().endsWith('.zip'));
    
    const fileDetails = await Promise.all(zipFiles.map(async (file) => {
      const filePath = path.join(folderPath, file);
      const stats = await fs.stat(filePath);
      return {
        name: file,
        size: stats.size,
        sizeReadable: formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime
      };
    }));
    
    res.json({
      success: true,
      category,
      folder,
      files: fileDetails
    });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

module.exports = {
  upload,
  getUploadPage,
  handleFileUpload,
  getBrowsePage,
  deleteFile,
  deleteFolder,
  deleteCategory,
  renameCategory,
  renameFolder,
  renameFile,
  getCategoriesAPI,
  getFoldersAPI,
  getFilesAPI
};