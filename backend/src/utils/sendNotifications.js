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

  const privateKey ="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDDCp00/d5pYWTE\n/ugu69Ls7rPd02f9NDj3HBReokWA+vz5Z22mGfhcsWsWU6nvSuyNy9i3beHqvDho\nitrHK2oqaEeOLvr9WY6ROCG7ph6fwcaQrKIPs5lM26rnUCRF6oZk9B2o+owGBoAt\nqJy6tcxCznpY9LwSCLovpxK70LDa3c6HnQuMiL5TjYqJtayES9Zt6VUm/HhJ5E9g\nO5nNJHjwLVl1h4Yn+ojTfnVfD3oM8cPBIc6c/6i9gWjwQgCH7PvWakzb4bEzRRdz\n5hITZnKQOU81bq0FkV0g8ot97F4PcIV72eKA9dWMgEsb/Sjf1ouM2hqLUcm8rnde\n27+GIFlzAgMBAAECggEARfKXCauoKZPfr1SZ0UYK2aULxZitOR4S9fBQj9XTZlvd\nANbqeIDk1N1eAd5UWfi9WGcMXFBgjq4c7sUpi/dSdk36p4/KvLRzEDqYwnLjlbjJ\nbRY0crwe1PUM2DMiJx7iPu9becANGpYXPwiy2LUdQbJKJ3/xuOf/WdqpuciwvHTh\nJGVsnl2gdXgBbR7soLVMtZ8ELY6HgrSGcUP65A8JC9KgjSrHXZ0R5YGOiAmw90aj\nWulkZtgpidbfMgKh09pPCvBL7Ax6PQB8K8a3pm7JhBq6DGnjqsNUGDN5FxfkHVCy\nKPfS1bmMq959ZpQRnpra8sVCjWI2ZeziVVft6Bx1TQKBgQD+GcNukYRdMYMrOa06\now0Krd9hkWSFPBu4H4H+0VMUin7VZGpLxZQ5mTYbRRMU7IKCf7GhTAvEcGHhzJb2\nbH0JiCXo8NkumzmkWGa2WeHWxpQhgTGiblMOwcqmnmUeuGybVCdZDmQCYIFQVNkM\n7M+YrnUtXYfBT+8bgJkIPYUTvwKBgQDEf9ZjlmOEeJPq5cnlFULEVWSUncKiaZNR\nBKEYwjBvQKs3jCFVgEyC/bUR61J62H9NhmBaXOlSiJ8kwNM8967OKzlR8q+bRoE7\n2XdLKASZ1tUxuL+XiXhy/B07qOvnTZiFFiJd/k9K0kFPFMjzsMxz4g6gLSTILUba\nOq0jj3zXTQKBgH7/e2jgu+okG+3XttfOtG749eN62mWo5CXDQaKNFlv22Gto86OJ\nTYr4I02/2Uik6Jm2np4CNwNoM9O6AF2LXXcNH/1rmvCrTkTwle1fwPsqZtDUFG2d\nfE+s1c8u7VVMUaPUjJH7GksB1r/CmHTYSu2BjDkvPPGGNPhm7pVqwf9bAoGABThU\nLK8ZE7LUUyApneFTtb2C/4O1YPUnCbbyxKKcAMiaA87AL/JJlg1BWymCNms77oZM\nVvoy5JNmjuZkdjEqPqXdTvUAf0J/OmTLi36TqLaRUVHUHSV0wrE54ZTaN3nTPG3b\nGd4gox80xvIJaJfgxo9RziWE3aB+SlvWr6QnL90CgYBf/tFSLJOjy++datMEt+Nf\nyoTjyKpFWTXOuSCsP+Uqfpcs5tt9rEp/MbKPD+tVIO2kPPZJrmfrWbIq5sBzoKmb\nVj1CHiVpGks+MvX12zx8tXkww5N6M47gCwrGpgvfKMkl54vPJrT3M4lB/nCCK0pn\nJQozchEjn/v3rJrfMLmP/Q==\n-----END PRIVATE KEY-----\n"
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
