require("dotenv").config();

module.exports = {
  PORT: process.env.PORT || 4000,
  MONGO_URI: process.env.MONGO_URI,      // MongoDB connection string
  EMAIL_USER: process.env.EMAIL_USER,    // Gmail address
  EMAIL_PASS: process.env.EMAIL_PASS, 
  JWT_SECRET: process.env.JWT_SECRET   // Gmail App Password
};
