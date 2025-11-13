const mongoose = require("mongoose");

let isConnected = false;

const connectDB = async (uri) => {
  if (isConnected) {
    console.log("⚡ MongoDB already connected (shared)");
    return;
  }
  let url;
  if(!uri) url=process.env.MONGO_URI
  
  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log("✅ MongoDB Connected (Shared)");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
  }
};

module.exports = connectDB;
