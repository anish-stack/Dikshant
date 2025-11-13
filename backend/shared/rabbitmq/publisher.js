const { getChannel } = require("./connection");

const publishToQueue = async (queue, data) => {
  const channel = getChannel();
  if (!channel) return console.error("⚠️ RabbitMQ channel not ready");

  await channel.assertQueue(queue);
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)));
  console.log(`📤 Sent to ${queue}`);
};

module.exports = publishToQueue;
