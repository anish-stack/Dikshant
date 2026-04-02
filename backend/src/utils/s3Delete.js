const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/s3");

async function deleteFromS3(fileUrl) {
  try {
    if (!fileUrl) return;

    const urlParts = fileUrl.split("/");
    const key = urlParts.slice(3).join("/"); 

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
    };

    await s3.send(new DeleteObjectCommand(params));
    console.log("Old File Deleted:", key);
  } catch (error) {
    return error; // return error to be handled by caller

  }
}

module.exports = deleteFromS3;
