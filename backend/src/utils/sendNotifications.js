require("dotenv").config(); // ✅ Ensure .env variables are loaded early
const admin = require("firebase-admin");

class FirebaseInitializationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FirebaseInitializationError";
  }
}

class NotificationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "NotificationError";
    this.code = code;
  }
}

// ──────────────────────────────
// Logger Utility
// ──────────────────────────────
const logger = {
  info: (msg) => console.log(`ℹ️ ${msg}`),
  warn: (msg) => console.warn(`⚠️ ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  debug: (msg) => console.debug(`🐛 ${msg}`),
};

// ──────────────────────────────
// Firebase Initialization
// ──────────────────────────────
const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    logger.info("Firebase already initialized");
    return admin;
  }

  // ✅ Required Firebase keys
  const requiredEnvVars = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_PRIVATE_KEY_ID",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_ID",
    "FIREBASE_AUTH_URI",
    "FIREBASE_TOKEN_URI",
    "FIREBASE_AUTH_PROVIDER_CERT_URL",
    "FIREBASE_CERT_URL",
  ];
  //  ❌ 🚫 Missing Firebase environment variables: FIREBASE_CLIENT_EMAIL, FIREBASE_CERT_URL


  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingVars.length > 0) {
    const missingList = missingVars.join(", ");
    logger.error(`🚫 Missing Firebase environment variables: ${missingList}`);
    throw new FirebaseInitializationError(
      `Missing Firebase env vars: ${missingList}`
    );
  }

  const privateKey ="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDMkMf0gA07XVkl\ngYAIyX37VLkJT0sikKq7smDHo1Z2G1+FksnWrPxwA99CeuI7Q0+Bgr3HPQ+Fn2TU\nyvd3v8IqqjyzcfGPdXe8CJcvL2yqxS/Gn7D+wHIQjFNRHudd2RgE1hFbYqtm1f4p\n65vydeUH/Klzf/kimigcOK++qYGj0D8gpnRWaQGjIPxd1CDgpPfjqpSn7SWx5Q85\n8HOIIhHJ6RAOYX9SoKWcxflFwc4SoN68ru31a8PDUaymUtg1zWb3imURRCjh4mnQ\ns+8GQRFu39o08AaVM+n+RcCFEN7fBWviuiNOSTEz0l96IBXAg3Fu0d2QX274UOUe\n3nc9iMn9AgMBAAECggEAEQlVvcUUVQdXL0pzsUemmFHb/yx9Y2mM7ojSio3N25Q4\nBlXNPXW2qFWKOG0nfiwC6RRMXdV1/3jg2t/0cCKmNwtqdr9ckMgFqsFEZgebEzXM\n3svZ372DQmGNZsoeFrDH0U9KrsOu5qeXvUIEANNUua+PJTFZPEp+YKtP558STuQY\n2ysgXr7yFh5hOymM5j8X6oKS+aO/+IHLCSMYwtsONpI2IjH100lO8YhRXBqr/ML3\nNvlqo9X9MPzyMiPrVCHUK1AfEPFvqQ3cbuOqAwyHyFiTLnM5ZZJ/qLTwU4FRjHao\nVkDODh5X0KzNx0PWkzA8ON61vikfPREwKfhqAwXwgQKBgQDsBZRrYOoCk6UBWxjd\ng7c21wuPXKqvrXuFy8yXZmFZiHf4P0BI8qgEfJfI3nQnT8sYdCTBiWeJ7tRUNAPK\nwwMDLRHYr5x70Zek4iyOcOxIneDN8rjGB79mv1mIdiu+jgT14F+dkWJvmmPqMDqs\nFBZkit09H1EEcfodcTP6Yj7gjQKBgQDd4ZFCX//ZNMw3Wad3h4R+pwFC0k7coVzk\n8UbCzl3j/MFD4SLmZIO8Gk4isBilYWsd5vNZfAct9ukTEm6ww7EkOtaeh7eYTypW\nBDGYXX2NNSpotFw4KpZRwLlTteN7adneX7tpLVuMpPDUN+cz37NW8kOtcKP5GljJ\nOAEqnTDLMQKBgHkoHBpK85VDCU763nbHqINEPLDpFs17to7mIS4O5iY5wavzfCJ2\nPf2fn6MDXojXkyAIbt3SlQ3fRau7z76EAMXemuyqqR9+ZePEHq84FHLqaH4P/P3a\n+EvcKi+8yZPV/4HgHfUarncvv951x4iR/zS5e/xmWQZ5I7V9aPs89535AoGBAIEE\nlM6fu8m1ZboZq8NZTbXHrngIikrImZeWpKrKDNZxNoAd/YkykVdjhGOvOeWQjBTL\nIl26PQKBPG4Wnb6zS+HhRMLR7/PktJ1nut76HfNqIsrXdXhDaz0Gb705Wpl8p28j\nA3rZIQ7bKh58kzgar9Gy9Z94jCBhLZdztVnuJV1BAoGAF7jKaT/zfo+aQFyjAWWM\nEXiSgW8q1upxyOigN1HUt4smdBe5HHx21TjxpNJZxzxdu8EdykyStdVc/bpIxnf/\nXe+u/Ek5SeXf6kXzsYETKNo12A1youo0vEDCI/conPSa2eKojWLxPEqaSQzvwCvw\ntVTk3Yx/pUGNb0J5xKjxQkA=\n-----END PRIVATE KEY-----\n"
  try {

    if (privateKey && privateKey.includes("\\n")) {
      console.log("🔧 Fixing escaped newlines (\\n) in private key...");
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    // 🔐 Validate private key format
    if (!privateKey.includes("BEGIN PRIVATE KEY") || !privateKey.includes("END PRIVATE KEY")) {
      console.error("❌ Invalid PEM key format in privateKey!");
      throw new FirebaseInitializationError("Invalid PEM formatted message in private_key");
    }
    const credentialConfig = {
      type: process.env.FIREBASE_TYPE || "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@olyox-6215a.iam.gserviceaccount.com",
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url:
        process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CERT_URL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(credentialConfig),
      databaseURL: process.env.FIREBASE_DATABASE_URL || "",
    });

    logger.info("✅ Firebase Admin SDK initialized successfully");
    return admin;
  } catch (error) {
    if (error.message.includes("invalid_grant")) {
      console.error("⚠️ HINT: Check server time (NTP sync) and service account validity.");
      console.log("🕒 Current Server Time:", new Date().toISOString());
    }

    logger.error(`🔥 Firebase Initialization Failed: ${error.message}`);
    throw new FirebaseInitializationError(error.message);
  }
};

// ──────────────────────────────
// Send Notification
// ──────────────────────────────
const sendNotification = async (token, title, body, channel) => {
  console.log("✅ Notification Channel:", channel);
  initializeFirebase();

  try {
    if (!token) {
      logger.error("❌ No FCM token provided");
      throw new NotificationError("No FCM token provided", "INVALID_TOKEN");
    }

    const message = {
      token,
      notification: {
        title: title ,
        body: body ,
      },
      android: {
        priority: "high",
        notification: {
          channelId: channel ,
          clickAction: "",
          imageUrl:"https://i.ibb.co/TxJRvf12/favicon.png"
        },
      },
    };

    const response = await admin.messaging().send(message);
    logger.info(`✅ Notification sent successfully to token: ${token}`);
    return response;

  } catch (error) {
    logger.error(`❌ Notification Error: ${error.message}`);

    // ✅ Handle invalid or unregistered tokens
    if (error.errorInfo && error.errorInfo.code === "messaging/registration-token-not-registered") {
      logger.warn(`⚠️ Token invalid or app uninstalled — cleaning up: ${token}`);

    
    }

    if (error instanceof NotificationError) return null;
    return null;
  }
};

const sendMultipleNotifications = async (users,tokens, title, body, channel = "default") => {
  initializeFirebase();

  if (!Array.isArray(tokens) || tokens.length === 0) {
    logger.error("Tokens must be a non-empty array");
    throw new NotificationError("Invalid tokens array", "INVALID_ARGUMENTS");
  }

  // Filter valid tokens
  const validTokens = tokens.filter(t => typeof t === "string" && t.trim() !== "");
  if (validTokens.length === 0) {
    throw new NotificationError("No valid tokens provided", "INVALID_TOKEN");
  }

  const BATCH_SIZE = 100; // Old SDK: send in small batches to avoid overload
  let successCount = 0;
  let failureCount = 0;
  const failedTokens = [];

  // Process tokens in batches
  for (let i = 0; i < validTokens.length; i += BATCH_SIZE) {
    const batch = validTokens.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(async (token) => {
      try {
        await admin.messaging().send({
          token,
          notification: { title, body },
          android: {
            priority: "high",
            notification: {
              channelId: channel,
              imageUrl:
                "https://www.dikshantias.com/_next/image?url=https%3A%2F%2Fdikshantiasnew-web.s3.ap-south-1.amazonaws.com%2Fweb%2F1757750048833-e5243743-d7ec-40f6-950d-849cd31d525f-dikshant-logo.png&w=384&q=75",
            },
          },
        });
        successCount++;
      } catch (error) {
        failureCount++;
        failedTokens.push({ token, error: error.message || "Unknown error" });
        logger.warn(`❌ Failed to send notification to token: ${token} | ${error.message}`);
      }
    });

    // Wait for batch to finish
    await Promise.all(batchPromises);
  }

  logger.info(`📢 Notifications sent: ${successCount} success, ${failureCount} failed`);
  return { success: true, successCount, failureCount, failedTokens };
};


const sendToTopic = async (topic, title, body, channel = "default") => {
  initializeFirebase();

  if (!topic || typeof topic !== "string" || topic.trim() === "") {
    throw new NotificationError("Invalid topic name", "INVALID_TOPIC");
  }

  const message = {
    topic: topic.trim(),
    notification: { title, body },
    android: {
      priority: "high",
      notification: {
        channelId: channel,
        imageUrl: "https://www.dikshantias.com/_next/image?url=https%3A%2F%2Fdikshantiasnew-web.s3.ap-south-1.amazonaws.com%2Fweb%2F1757750048833-e5243743-d7ec-40f6-950d-849cd31d525f-dikshant-logo.png&w=384&q=75",
      },
    },
    data: { channel }, // Optional data payload
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`Topic notification sent to '${topic}' | Message ID: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error(`Topic send failed: ${error.message}`);
    throw new NotificationError(error.message);
  }
};

module.exports = {
  sendToTopic,
  sendMultipleNotifications,
  initializeFirebase,
  sendNotification,
};
