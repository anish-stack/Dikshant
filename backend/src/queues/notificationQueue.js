import Bull from "bull";
import sendNotification from "../utils/sendNotifications.js";
import models from "../models/index.js";

const { Notification } = models;

export const notificationQueue = new Bull("notificationQueue", {
  redis: { host: "127.0.0.1", port: 6379 },
});

notificationQueue.process(async (job) => {
  const { users, tokens, title, message, channel, type = "general", relatedId = null } = job.data;

  try {

    console.log("🔔 Notification Job Started");

    const notificationRecords = users.map((user) => ({
      userId: user?.id,
      title,
      message,
      type,
      relatedId,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await Notification.bulkCreate(notificationRecords);

    console.log(`✅ ${notificationRecords.length} notifications saved`);

    const BATCH_SIZE = 500;

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {

      const batchTokens = tokens.slice(i, i + BATCH_SIZE);
      const batchUsers = users.slice(i, i + BATCH_SIZE);

      await sendNotification.sendMultipleNotifications(
        batchUsers,
        batchTokens,
        title,
        message,
        channel
      );

      console.log(`📤 Sent batch ${i / BATCH_SIZE + 1}`);
    }

    console.log("✅ Notification Job Completed");

  } catch (err) {
    console.error("❌ Notification Job Error:", err);
    throw err;
  }
});