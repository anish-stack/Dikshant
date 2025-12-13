const Redis = require("ioredis");
require('dotenv').config();

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy() {
    return 2000; // retry every 2 sec
  }
});

redis.on("error", () => {
  console.log("Redis not running — continuing without redis...");
});

module.exports = redis;
