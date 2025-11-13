const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST || "redis", // 👈 Docker service name
  port: process.env.REDIS_PORT || 6379,
});

redis.on("connect", () => {
  console.log("✅ Redis Connected Successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis Error:", err);
});

module.exports = redis;
