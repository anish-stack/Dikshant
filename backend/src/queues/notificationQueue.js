import Bull from "bull";
import sendNotification from "../utils/sendNotifications.js";
import { Notification } from "../models";

export const notificationQueue = new Bull("notificationQueue", {
  redis: { host: "127.0.0.1", port: 6379 },
});

notificationQueue.process(async (job) => {
  const { users, tokens, title, message, channel, type = "general", relatedId = null } = job.data;

  try {

    console.log("🔔 Notification Job Started");

    // -----------------------------
    // 1️⃣ SAVE NOTIFICATIONS IN DB
    // -----------------------------
    const notificationRecords = users.map((userId) => ({
      userId:userId?.id,
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

    // -----------------------------
    // 2️⃣ SEND PUSH NOTIFICATION
    // -----------------------------
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

    return Promise.resolve();

  } catch (err) {
    console.error("❌ Notification Job Error:", err);
    throw err;
  }
});