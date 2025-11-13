// test-rabbit.js
const amqplib = require("amqplib");

(async () => {
  try {
    const conn = await amqplib.connect("amqp://guest:guest@localhost:5672");
    console.log("✅ RabbitMQ Connected!");
    await conn.close();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
})();
