const Setting = require("../../models/Setting");

// GET Settings Page
exports.getSettingsPage = async (req, res) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting({
        siteName: "",
        contactEmail: "",
        facebookUrl: "",
        instagramUrl: "",
        twitterUrl: "",
        linkedinUrl: "",
        address: ""
      });
      await settings.save();
    }

    res.render("admin/settings", {
      title: "Settings",
      layout: "admin/adminLayout",
      user: req.user,
      settings,
      success: req.query.success ? true : false
    });

  } catch (error) {
    console.error("Error loading settings:", error);
    res.status(500).send("Internal Server Error");
  }
};


// UPDATE SETTINGS
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting();
    }

    settings.siteName = req.body.siteName;
    settings.contactEmail = req.body.contactEmail;
    settings.facebookUrl = req.body.facebookUrl;
    settings.instagramUrl = req.body.instagramUrl;
    settings.twitterUrl = req.body.twitterUrl;
    settings.linkedinUrl = req.body.linkedinUrl;
    settings.address = req.body.address;

    await settings.save();

    res.redirect("/admin/settings?success=1");
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).send("Error updating settings");
  }
};
