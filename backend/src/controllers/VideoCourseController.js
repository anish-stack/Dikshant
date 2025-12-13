"use strict";

const { VideoCourse } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

class VideoCourseController {
  // CREATE
  static async create(req, res) {
    try {
      const requiredFields = [
        "title",
        "videoSource",
        "url",
        "batchId",
        "subjectId",
        "programId",
      ];
      console.log(req.body);
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`,
          });
        }
      }

      if (
        isNaN(req.body.batchId) ||
        isNaN(req.body.subjectId) ||
        isNaN(req.body.programId)
      ) {
        return res.status(400).json({
          success: false,
          message: "batchId, subjectId, and programId must be valid numbers",
        });
      }

      const validUrlRegex = /^(https?:\/\/)[\w.-]+(\.[\w\.-]+)+[/#?]?.*$/;
      if (!validUrlRegex.test(req.body.url)) {
        return res.status(400).json({
          success: false,
          message: "Invalid video URL format",
        });
      }

      const booleanFields = ["isDownloadable", "isDemo", "status"];

      for (const field of booleanFields) {
        if (req.body[field] !== undefined) {
          let val = req.body[field];

          // Already boolean
          if (typeof val === "boolean") {
            continue;
          }

          // Convert to lowercase string
          val = String(val).toLowerCase().trim();

          if (["true", "1", "yes", "active"].includes(val)) {
            req.body[field] = true;
          } else if (["false", "0", "no", "inactive"].includes(val)) {
            req.body[field] = false;
          } else {
            return res.status(400).json({
              success: false,
              message: `${field} must be true/false, 1/0, active/inactive`,
            });
          }
        }
      }

      const safeString = (value) =>
        typeof value === "string" ? value.trim().replace(/[<>]/g, "") : value;

      const payload = {
        title: safeString(req.body.title),
        videoSource: safeString(req.body.videoSource),
        url: safeString(req.body.url),
        batchId: Number(req.body.batchId),
        subjectId: Number(req.body.subjectId),
        programId: Number(req.body.programId),
        isDownloadable: req.body.isDownloadable === true,
        isDemo: req.body.isDemo === true,
        status: req.body.status === true,
        imageUrl: null,
      };

      if (req.file) {
        const validImageTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ];

        if (!validImageTypes.includes(req.file.mimetype)) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid file type. Only images are allowed (jpg, png, webp)",
          });
        }

        try {
          payload.imageUrl = await uploadToS3(req.file, "videocourses");
        } catch (err) {
          console.error("S3 Upload Error:", err);
          return res.status(500).json({
            success: false,
            message: "Failed to upload image",
          });
        }
      }

      const item = await VideoCourse.create(payload);

      try {
        await redis.del("videocourses");
      } catch (err) {
        console.warn("Redis delete failed:", err);
      }

      return res.status(201).json({
        success: true,
        message: "Video course created successfully",
        data: item,
      });
    } catch (error) {
      console.error("Create VideoCourse Error:", error);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET ALL
  static async findAll(req, res) {
    try {
      const cache = await redis.get("videocourses");

      if (cache) return res.json(JSON.parse(cache));

      const items = await VideoCourse.findAll();

      await redis.set("videocourses", JSON.stringify(items), "EX", 60);

      return res.json(items);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Error fetching video courses", error });
    }
  }

  // GET BY ID
  static async findOne(req, res) {
    try {
      const id = req.params.id;
      const cacheKey = `videocourse:${id}`;

      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));

      const item = await VideoCourse.findByPk(id);
      if (!item)
        return res.status(404).json({ message: "Video course not found" });

      await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Error fetching video course", error });
    }
  }

  // GET BY BATCH ID
  static async FindByBathId(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: "Batch ID is required",
        });
      }

      const items = await VideoCourse.findAll({
        where: { batchId: id },
      });

      return res.status(200).json({
        success: true,
        data: items,
      });
    } catch (error) {
      console.error("FindByBathId Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  // UPDATE
  static async update(req, res) {
    try {
      const item = await VideoCourse.findByPk(req.params.id);
      if (!item)
        return res.status(404).json({ message: "Video course not found" });

      let imageUrl = item.imageUrl;

      if (req.file) {
        if (item.imageUrl) await deleteFromS3(item.imageUrl);
        imageUrl = await uploadToS3(req.file, "videocourses");
      }

      await item.update({
        imageUrl,
        title: req.body.title || item.title,
        videoSource: req.body.videoSource || item.videoSource,
        url: req.body.url || item.url,
        batchId:
          req.body.batchId !== undefined ? req.body.batchId : item.batchId,
        subjectId:
          req.body.subjectId !== undefined
            ? req.body.subjectId
            : item.subjectId,
        isDownloadable:
          req.body.isDownloadable !== undefined
            ? req.body.isDownloadable
            : item.isDownloadable,
        isDemo: req.body.isDemo !== undefined ? req.body.isDemo : item.isDemo,
        status: req.body.status || item.status,
        programId: req.body.programId || item.programId,
      });

      await redis.del("videocourses");
      await redis.del(`videocourse:${req.params.id}`);

      return res.json(item);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Error updating video course", error });
    }
  }

  // DELETE
  static async delete(req, res) {
    try {
      const item = await VideoCourse.findByPk(req.params.id);
      if (!item)
        return res.status(404).json({ message: "Video course not found" });

      if (item.imageUrl) await deleteFromS3(item.imageUrl);

      await item.destroy();

      await redis.del("videocourses");
      await redis.del(`videocourse:${req.params.id}`);

      return res.json({ message: "Video course deleted" });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Error deleting video course", error });
    }
  }
}

module.exports = VideoCourseController;
