const express = require("express");
const dotenv = require("dotenv");
const { connectDB, redis, connectRabbitMQ } = require("./shared");

dotenv.config();

const app = express();
app.use(express.json());

// Initialize connections
(async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    await connectRabbitMQ();
    await redis.set("app_status", "running");
    console.log("🚀 Auth Service: Database, Redis, and RabbitMQ connected successfully");
  } catch (err) {
    console.error("❌ Error initializing services:", err.message);
  }
})();

// Root route
app.get("/", (req, res) => {
  res.send("✅ Auth Service is Running...");
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Auth Service running on port ${PORT}`));
