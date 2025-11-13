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
  res.json({ message: "🎥 LiveClass Service Running Successfully" });
});

const PORT = process.env.LIVECLASS_PORT || 4004;
app.listen(PORT, () => console.log(`🎥 LiveClass Service running on port ${PORT}`));
