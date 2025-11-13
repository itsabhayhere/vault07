const mongoose = require("mongoose");

const downloadLinkSchema = new mongoose.Schema({
  postId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Post", 
    required: true,
    index: true // Index for faster queries
  },
  token: { 
    type: String, 
    required: true, 
    unique: true,
    index: true // Index for faster token lookups
  },
  type: { 
    type: String, 
    enum: ["pdf", "doc"], 
    default: "pdf" 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: true // Index for cleanup queries
  },
  used: { 
    type: Boolean, 
    default: false,
    index: true // Index for filtering used links
  },
  usedAt: { 
    type: Date // Track when the link was actually used
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient cleanup queries
downloadLinkSchema.index({ expiresAt: 1, used: 1 });

// TTL index to automatically delete expired documents after 24 hours
// This is a safety net in addition to manual cleanup
downloadLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

// Virtual for checking if link is valid
downloadLinkSchema.virtual('isValid').get(function() {
  return !this.used && this.expiresAt > new Date();
});

// Method to check if link can be used
downloadLinkSchema.methods.canUse = function() {
  const now = new Date();
  return !this.used && this.expiresAt > now;
};

// Static method to find valid link by token
downloadLinkSchema.statics.findValidLink = async function(token) {
  return this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() }
  });
};

// Pre-save hook to ensure token is unique
downloadLinkSchema.pre('save', async function(next) {
  if (this.isNew && !this.token) {
    const crypto = require('crypto');
    this.token = crypto.randomBytes(32).toString('hex');
  }
  next();
});

module.exports = mongoose.model("DownloadLink", downloadLinkSchema);