"use strict";

const { VideoCourse } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

class VideoCourseController {

  /* ======================
      CREATE
  ====================== */
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

      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`,
          });
        }
      }

      const payload = {
        title: req.body.title.trim(),
        videoSource: req.body.videoSource,
        url: req.body.url,
        batchId: Number(req.body.batchId),
        subjectId: Number(req.body.subjectId),
        programId: Number(req.body.programId),
        isDownloadable: req.body.isDownloadable === true,
        isDemo: req.body.isDemo === true,
        status: req.body.status === true,
        imageUrl: null,
      };

      if (req.file) {
        payload.imageUrl = await uploadToS3(req.file, "videocourses");
      }

      const item = await VideoCourse.create(payload);

      // 🔥 CLEAR ALL RELATED CACHE
      await redis.del("videocourses");
      await redis.del(`videocourses:batch:${payload.batchId}`);

      return res.status(201).json({
        success: true,
        message: "Video course created successfully",
        data: item,
      });
    } catch (error) {
      console.error("Create Error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* ======================
      GET ALL
  ====================== */
  static async findAll(req, res) {
    try {
      // const cacheKey = "videocourses";

      // const cache = await redis.get(cacheKey);
      // if (cache) {
      //   return res.json(JSON.parse(cache));
      // }

      const items = await VideoCourse.findAll();

      // await redis.set(cacheKey, JSON.stringify(items), "EX", 60);

      return res.json(items);
    } catch (error) {
      return res.status(500).json({ message: "Fetch failed", error });
    }
  }

  /* ======================
      GET BY ID
  ====================== */
  static async findOne(req, res) {
    try {
      const { id } = req.params;
      // const cacheKey = `videocourse:${id}`;

      // const cache = await redis.get(cacheKey);
      // if (cache) return res.json(JSON.parse(cache));

      const item = await VideoCourse.findByPk(id);
      if (!item) {
        return res.status(404).json({ message: "Not found" });
      }

      // await redis.set(cacheKey, JSON.stringify(item), "EX", 300);
      return res.json(item);
    } catch (error) {
      return res.status(500).json({ message: "Fetch failed", error });
    }
  }

  /* ======================
      GET BY BATCH ID (FIXED + REDIS)
  ====================== */
  static async FindByBathId(req, res) {
    try {
      const { id } = req.params;
      // const cacheKey = `videocourses:batch:${id}`;

      // const cache = await redis.get(cacheKey);
      // if (cache) {
      //   return res.json({
      //     success: true,
      //     data: JSON.parse(cache),
      //   });
      // }

      const items = await VideoCourse.findAll({
        where: { batchId: id },
      });

      // await redis.set(cacheKey, JSON.stringify(items), "EX", 120);

      return res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* ======================
      UPDATE
  ====================== */
  static async update(req, res) {
    try {
      const item = await VideoCourse.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Not found" });

      let imageUrl = item.imageUrl;

      if (req.file) {
        if (item.imageUrl) await deleteFromS3(item.imageUrl);
        imageUrl = await uploadToS3(req.file, "videocourses");
      }

      await item.update({ ...req.body, imageUrl });

      // 🔥 CLEAR CACHE
      await redis.del("videocourses");
      await redis.del(`videocourse:${item.id}`);
      await redis.del(`videocourses:batch:${item.batchId}`);

      return res.json(item);
    } catch (error) {
      return res.status(500).json({ message: "Update failed", error });
    }
  }

  /* ======================
      DELETE (🔥 MAIN FIX)
  ====================== */
  static async delete(req, res) {
    try {
      const item = await VideoCourse.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Not found" });
      }

      if (item.imageUrl) {
        await deleteFromS3(item.imageUrl);
      }

      const batchId = item.batchId;

      await item.destroy();

      // 🔥🔥 CLEAR ALL POSSIBLE CACHE
      await Promise.all([
        redis.del("videocourses"),
        redis.del(`videocourse:${req.params.id}`),
        redis.del(`videocourses:batch:${batchId}`),
      ]);

      return res.json({
        success: true,
        message: "Video course deleted successfully",
      });
    } catch (error) {
      console.error("Delete Error:", error);
      return res.status(500).json({ message: "Delete failed", error });
    }
  }
}

module.exports = VideoCourseController;
