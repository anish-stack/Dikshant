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
  res.json({ message: "💳 Payment Service Running Successfully" });
});

const PORT = process.env.PAYMENT_PORT || 4006;
app.listen(PORT, () => console.log(`💳 Payment Service running on port ${PORT}`));
