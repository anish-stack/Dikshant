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
  res.json({ message: "📘 Course Service Running Successfully" });
});

const PORT = process.env.COURSE_PORT || 4003;
app.listen(PORT, () => console.log(`📘 Course Service running on port ${PORT}`));
