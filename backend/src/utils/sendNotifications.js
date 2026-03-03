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

  const privateKey ="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC8tciAZhzIHhjx\n0yuFxNiA6SQeyv5xedfWGwpgoGkwiTBwbEviIFmPq1thWAJOx1j52dCXPnquk1m9\n5x5ZFi3tMrpN+zBuZQxoESZ4RG3inTEqDPxkPP+NnDifI1bQOXfXFfLwYk8wSpRV\n2yyHQz9EggWNZXPGp6znutzNs+je30+OlGzrXF06Av1d5WPTZ4WgT5GAviArso33\na+DfMFoId6ebjeAu5RbHhLylwqW4c/uVJlVpG1eXvOG8u6v2sfLvyyW/mt3JHSgj\nVUvbrvGUcgRakx5CPqC2YQYmbNeimhUR+A4U1MOUo3mIVVXTL59gpRfIBdPhq8t0\n32NCcUD7AgMBAAECggEAA9mNipkKs0Zx6dUOCT+XzyFyfDJV+Iisz5BjqM789mGG\nHHUJI0bXrOepCJZcDbFhbk90QvGiXRdieE5TvyuFqlYjmN2sAkSLeUAIUeHLgBkG\n3L3BFGZuLDxop054Qe06Nagb+a13whtzZUEAao4Dp2kjpdvQ/deD3oJgaM3nzUwl\n/Gkc9hMaMIWjAcje0UnoHARAEDtgbZvkPisIoZUoAIwbtl/CtV4lJ1hzOyuh+Ntp\ncqDjxrsi6q0WulbUayUNOIdNjMDs62NWmsPUgaKi8sz2qpXTvlmq12hFF2cLpgLi\nGHg7IqZgbTsMzE4sYF3IdPofJUK+RGhCnp3ve0JziQKBgQDsbln6ojyKvVc8HkCu\n7WM6mHEXhVNK8QwiQgBgD2rcz7+/sBZ1BLcMQPyU0bZ0PorS2Ojrgbgeg8a9OQWB\nYFZaowvrbIdGtBO59DbPIWSxChWJkvNdKk6Qrz6z9xxQOLrGIUSpoL9c9IebZOMA\nE9kr9snnb97yU6bMUQN1XkAgJwKBgQDMVEpEfM9aUEhHZAv8q6uQjN/NLkPWYXU9\njVlaBBWaw+YAVgbRAQqEyHl+QWewtlfFvF3i/Nlt9eYsSHCEM6iwUHnmQcC+qDsG\nALMExrVdj4xCMKYCiyBG92l0I2rARTL2OHDV1BrwXrmi57Zec6zW1YuDLduH6pd3\n+7wgNifJDQKBgQDAsyRlMevUTIQYPLQNnu/cZzjtqb38e8Ce/1pc8NPxSuYG7xcu\novwqYaE8Djz+O6dcOGyG3oBZZqAJw7rn+sQHNZLWe+s5xjW5vwEZCyeNYCGzsnDm\nA0Brjlm1xnduLv6T07Op6ZluwuLv1WdqvcKooYloN3bn3SQ6rOD7vSjYywKBgBOR\n+y8GGUIYMGQOFAvWUW9d3s2jIcI1wWns0OMLQxp4qt3bX3nDNMO1A9Xw48KMJGn+\n+asU9qpOhAY3xfcTj5ObkaFZKOHZ8RVJGdxaP+K/Lfrk9/GEa8oARmxmPAJAXnow\nu7XvQ8lD+Vm+AbyYLbTB7UPaL42cDXfjd4hKR5M9AoGBANYil0olrpHdiJIPKbR6\nTu1W/8fTwnLMnpajCpj5Jq7k4hPgcMOvqfa1eX23LInRpVUBm3gXt2I5GCd0rd0J\n8GK/XmMdmH762gDCb6roo5WcJAExWnN+pJpwcmdXpBFuEHJQ0oTvsKhPzYAS0/Yf\nvFeNEfZ7xAgFvKgdfHctZ+5X\n-----END PRIVATE KEY-----\n"
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

const sendMultipleNotifications = async (tokens, title, body, channel = "default") => {
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
