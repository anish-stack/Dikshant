const { getChannel } = require("./connection");

const consumeQueue = async (queue, callback) => {
  const channel = getChannel();
  if (!channel) return console.error("⚠️ Channel not ready");
  await channel.assertQueue(queue);
  channel.consume(queue, (msg) => {
    if (msg) {
      const data = JSON.parse(msg.content.toString());
      callback(data);
      channel.ack(msg);
    }
  });
  console.log(`📥 Listening on ${queue}`);
};

module.exports = consumeQueue;
