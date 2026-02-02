
import Bull from 'bull';
import sendNotification from '../utils/sendNotifications.js'; // make sure to include .js

export const notificationQueue = new Bull('notificationQueue', {
  redis: { host: '127.0.0.1', port: 6379 },
});

// Process jobs
notificationQueue.process(async (job) => {
  const { tokens, title, message, channel } = job.data;

  // Send in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);
    await sendNotification.sendMultipleNotifications(batch, title, message, channel);
  }

  return Promise.resolve();
});
