const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  otp: {
    type: Number,
    default: null,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"], // restricts to only these two values
    default: "user",         // default role
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
