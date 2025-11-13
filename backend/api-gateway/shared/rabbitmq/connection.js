const amqplib = require("amqplib");

let connection, channel;

const connectRabbitMQ = async () => {
  try {
    connection = await amqplib.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log("🐇 RabbitMQ Connected (Shared)");
  } catch (error) {
    console.error("❌ RabbitMQ Error:", error.message);
  }
};

const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel };
