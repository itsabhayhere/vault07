const mongoose = require("mongoose");

const downloadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true
  },
  fileType: {
    type: String,
    enum: ["pdf", "zip"],
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  downloadedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient queries
downloadSchema.index({ userId: 1, downloadedAt: -1 });
downloadSchema.index({ postId: 1, fileType: 1 });

// Static method to check daily download limit
downloadSchema.statics.checkDailyLimit = async function(userId, limit = 5) {
  try {
    if (!userId) {
      return { count: 0, remaining: limit, limitReached: false };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await this.countDocuments({
      userId: userId,
      downloadedAt: { $gte: today }
    });

    return {
      count,
      remaining: Math.max(0, limit - count),
      limitReached: count >= limit
    };
  } catch (error) {
    console.error("Error checking daily limit:", error);
    // Return safe defaults on error
    return { count: 0, remaining: limit, limitReached: false };
  }
};

// Static method to get user download history
downloadSchema.statics.getUserHistory = async function(userId, limit = 50) {
  try {
    return await this.find({ userId })
      .populate("postId", "title slug")
      .sort({ downloadedAt: -1 })
      .limit(limit);
  } catch (error) {
    console.error("Error fetching user history:", error);
    throw error;
  }
};

// Static method to get post download statistics
downloadSchema.statics.getPostStats = async function(postId) {
  try {
    return await this.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      {
        $group: {
          _id: "$fileType",
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" }
        }
      },
      {
        $project: {
          fileType: "$_id",
          downloads: "$count",
          uniqueUsers: { $size: "$uniqueUsers" },
          _id: 0
        }
      }
    ]);
  } catch (error) {
    console.error("Error fetching post stats:", error);
    throw error;
  }
};

module.exports = mongoose.model("Download", downloadSchema);