const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();
const { connectRabbitMQ, redis } = require("./shared");
const app = express();

(async () => {
  await connectRabbitMQ();
})();

app.get("/", async (req, res) => {
  await redis.set("gateway", "running");
  const value = await redis.get("gateway");
  res.json({ message: "🌐 API Gateway running best", status: value });
});

app.use("/auth", createProxyMiddleware({ target: "http://auth-service:4001", changeOrigin: true }));
app.use("/chat", createProxyMiddleware({ target: "http://chat-service:4002", changeOrigin: true }));
app.use("/course", createProxyMiddleware({ target: "http://course-service:4003", changeOrigin: true }));
app.use("/liveclass", createProxyMiddleware({ target: "http://liveclass-service:4004", changeOrigin: true }));
app.use("/notification", createProxyMiddleware({ target: "http://notification-service:4005", changeOrigin: true }));
app.use("/payment", createProxyMiddleware({ target: "http://payment-service:4006", changeOrigin: true }));
app.use("/progress", createProxyMiddleware({ target: "http://progress-service:4007", changeOrigin: true }));
app.use("/test", createProxyMiddleware({ target: "http://test-service:4008", changeOrigin: true }));

const PORT = process.env.API_GATEWAY_PORT || 4000;
app.listen(PORT, () => console.log(`🌐 API Gateway running on port ${PORT}`));
