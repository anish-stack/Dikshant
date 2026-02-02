const { S3Client } = require("@aws-sdk/client-s3");
require('dotenv').config();

if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
  console.error("❌ AWS credentials missing");
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

module.exports = s3;

