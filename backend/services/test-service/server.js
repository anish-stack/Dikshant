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
  res.json({ message: "🧪 Test Service Running Successfully" });
});

const PORT = process.env.TEST_PORT || 4008;
app.listen(PORT, () => console.log(`🧪 Test Service running on port ${PORT}`));
