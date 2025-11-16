const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/adminController/settingController");
const adminMiddleware = require("../middleware/adminMiddleware");

// GET: Load settings page
router.get("/", adminMiddleware, settingsController.getSettingsPage);

// POST: Update settings
router.post("/", adminMiddleware, settingsController.updateSettings);

module.exports = router;
