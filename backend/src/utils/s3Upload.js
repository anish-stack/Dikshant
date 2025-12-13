const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");
const { v4: uuid } = require("uuid");

async function uploadToS3(file, folder = "programs") {
  const fileKey = `app/${folder}/${uuid()}-${file.originalname}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.AWS_BUCKET}.s3.amazonaws.com/${fileKey}`;
}

module.exports = uploadToS3;
