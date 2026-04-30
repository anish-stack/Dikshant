const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/s3");


const s3GetSignedUrl = async (key, expiresIn = 3600) => {
  try {
    if (!key) {
      throw new Error("S3 object key is required");
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn,
    });

    return signedUrl;
  } catch (error) {
    console.error("S3 Signed URL Error:", error);
    throw error;
  }
};

module.exports = s3GetSignedUrl;