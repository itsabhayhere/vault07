// models/Visitor.js
const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  ip: { type: String, required: true },
  country: { type: String, default: "Unknown" },
  visitedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Visitor", visitorSchema);
