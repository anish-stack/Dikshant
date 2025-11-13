const express = require("express");
require("dotenv").config();
const { connectDB, connectRabbitMQ } = require("../../shared");

const app = express();
app.use(express.json());

(async () => {
  await connectDB();
  await connectRabbitMQ();
})();

app.get("/", (req, res) => {
  res.json({ message: "🔔 Notification Service Running Successfully" });
});

const PORT = process.env.NOTIFICATION_PORT || 4005;
app.listen(PORT, () => console.log(`🔔 Notification Service running on port ${PORT}`));
