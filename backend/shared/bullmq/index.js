const { Queue, Worker } = require("bullmq");
const redis = require("../redis");

const createQueue = (name) => new Queue(name, { connection: redis });
const createWorker = (name, processor) =>
  new Worker(name, processor, { connection: redis });

module.exports = { createQueue, createWorker };
