const amqplib = require("amqplib");

let connection, channel;

const connectRabbitMQ = async (retries = 10, delay = 5000) => {
  while (retries) {
    try {
    const conn = await amqplib.connect("amqp://guest:guest@localhost:5672");
      channel = await connection.createChannel();
      console.log("🐇 RabbitMQ Connected (Shared)");
      return;
    } catch (error) {
      console.error(`❌ RabbitMQ Error: ${error.message}`);
      retries -= 1;

      if (retries === 0) {
        console.error("❌ All retry attempts failed — could not connect to RabbitMQ.");
        process.exit(1); // stop container if it never connects
      }

      console.log(`⏳ Retrying RabbitMQ connection in ${delay / 1000}s... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel };
