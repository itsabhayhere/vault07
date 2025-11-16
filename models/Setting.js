const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      required: true,
    },

    logoUrl: {
      type: String,
      default: null,
    },

    contactEmail: {
      type: String,
      required: true,
    },

    contactPhone: {
      type: String,
      default: null,
    },

    // Social Media Links
    facebookUrl: { type: String, default: null },
    instagramUrl: { type: String, default: null },
    twitterUrl: { type: String, default: null },
    linkedinUrl: { type: String, default: null },
    youtubeUrl: { type: String, default: null },

    // Address / Footer Info
    address: { type: String, default: null },
    aboutText: { type: String, default: null },

    // Optional SEO defaults
    defaultMetaTitle: { type: String, default: null },
    defaultMetaDescription: { type: String, default: null },

    // Any extra settings
    enableMaintenanceMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Setting", settingsSchema);
