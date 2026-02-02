const crypto = require("crypto");

if (!process.env.VIDEO_SECRET_KEY) {
  throw new Error("VIDEO_SECRET_KEY is missing in env");
}

const SECRET = crypto
  .createHash("sha256")
  .update(process.env.VIDEO_SECRET_KEY)
  .digest(); // 32 bytes

// Fixed IV derived from videoId + batchId (deterministic)
function getDeterministicIV(videoId, batchId) {
  const data = `${videoId}-${batchId}`;
  return crypto.createHash("sha256").update(data).digest().slice(0, 12); // 12 bytes for GCM
}

function encryptVideoPayload(payload) {
  const { videoId, batchId } = payload;

  // Deterministic IV → same input = same token
  const iv = getDeterministicIV(videoId, batchId);

  const cipher = crypto.createCipheriv("aes-256-gcm", SECRET, iv);

  let encrypted = cipher.update(JSON.stringify(payload), "utf8", "base64");
  encrypted += cipher.final("base64");

  const tag = cipher.getAuthTag().toString("base64");

  return Buffer.from(
    JSON.stringify({
      iv: iv.toString("base64"),
      data: encrypted,
      tag,
    })
  ).toString("base64");
}

function decryptVideoToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf8"));

    const iv = Buffer.from(decoded.iv, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", SECRET, iv);
    decipher.setAuthTag(Buffer.from(decoded.tag, "base64"));

    let decrypted = decipher.update(decoded.data, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return JSON.parse(decrypted);
  } catch (err) {
    throw new Error("Invalid or tampered video token");
  }
}

module.exports = {
  encryptVideoPayload,
  decryptVideoToken,
};