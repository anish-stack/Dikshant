"use strict";

const { VideoCourse } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
// const NotificationController = require("./NotificationController");

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
      ];

      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`,
          });
        }
      }

      const isLive = req.body.isLive === true || req.body.isLive === "true";

      if (isLive) {
        if (!req.body.DateOfLive || !req.body.TimeOfLIve) {
          return res.status(400).json({
            success: false,
            message:
              "DateOfLive and TimeOfLIve are required when the video is live",
          });
        }
      }

      const payload = {
        title: req.body.title.trim(),
        videoSource: req.body.videoSource,
        url: req.body.url.trim(),
        batchId: Number(req.body.batchId),
        subjectId: Number(req.body.subjectId),
        isDownloadable:
          req.body.isDownloadable === true ||
          req.body.isDownloadable === "true",
        isDemo: req.body.isDemo === true || req.body.isDemo === "true",
        isLive,
        DateOfLive: isLive ? req.body.DateOfLive : null,
        TimeOfLIve: isLive ? req.body.TimeOfLIve : null,
        status:"active",
        imageUrl: null,
      };

      if (req.file) {
        payload.imageUrl = await uploadToS3(req.file, "videocourses");
      }

      const item = await VideoCourse.create(payload);

      await redis.del("videocourses");
      await redis.del(`videocourses:batch:${payload.batchId}`);
      
      return res.status(201).json({
        success: true,
        message: "Video course created successfully",
        data: item,
      });
    } catch (error) {
      console.error("VideoCourse Create Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
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
      console.log(error)
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /* ======================
      UPDATE
  ====================== */
static async update(req, res) {
  try {
    const item = await VideoCourse.findByPk(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Video course not found",
      });
    }

    console.log("UPDATE BODY =>", req.body);

    // ============================
    // HELPERS
    // ============================
    const toBool = (val) =>
      val === true || val === "true" || val === 1 || val === "1";

    // ============================
    // SAFE FIELD RESOLUTION
    // ============================
    const isLive =
      req.body.isLive !== undefined
        ? toBool(req.body.isLive)
        : item.isLive;

    const isLiveEnded =
      req.body.isLiveEnded !== undefined
        ? toBool(req.body.isLiveEnded)
        : item.isLiveEnded;

    // ============================
    // VALIDATION
    // ============================
    if (
      req.body.isLive !== undefined &&
      isLive === true &&
      (!req.body.DateOfLive && !item.DateOfLive ||
        !req.body.TimeOfLIve && !item.TimeOfLIve)
    ) {
      return res.status(400).json({
        success: false,
        message: "DateOfLive and TimeOfLIve are required when isLive is true",
      });
    }

    // ============================
    // IMAGE UPLOAD
    // ============================
    let imageUrl = item.imageUrl;

    if (req.file) {
      if (item.imageUrl) {
        await deleteFromS3(item.imageUrl);
      }
      imageUrl = await uploadToS3(req.file, "videocourses");
    }

    // ============================
    // UPDATE PAYLOAD
    // ============================
    const updateData = {
      title: req.body.title?.trim() ?? item.title,
      videoSource: req.body.videoSource ?? item.videoSource,
      url: req.body.url?.trim() ?? item.url,

      batchId:
        req.body.batchId !== undefined
          ? Number(req.body.batchId)
          : item.batchId,

      subjectId:
        req.body.subjectId !== undefined
          ? Number(req.body.subjectId)
          : item.subjectId,

      isDownloadable:
        req.body.isDownloadable !== undefined
          ? toBool(req.body.isDownloadable)
          : item.isDownloadable,

      isDemo:
        req.body.isDemo !== undefined
          ? toBool(req.body.isDemo)
          : item.isDemo,

      isLive,
      isLiveEnded,

      // ✅ Clear date/time ONLY when isLive explicitly false
      DateOfLive:
        req.body.isLive === false || req.body.isLive === "false"
          ? null
          : req.body.DateOfLive ?? item.DateOfLive,

      TimeOfLIve:
        req.body.isLive === false || req.body.isLive === "false"
          ? null
          : req.body.TimeOfLIve ?? item.TimeOfLIve,

      // ✅ Set LiveEndAt ONLY when live ends
      LiveEndAt:
        req.body.isLiveEnded === true || req.body.isLiveEnded === "true"
          ? new Date()
          : item.LiveEndAt,

      status:
        req.body.status !== undefined
          ? req.body.status === "active" || req.body.status === true
            ? "active"
            : "inactive"
          : item.status,

      imageUrl,
    };

    // ============================
    // UPDATE DB
    // ============================
    await item.update(updateData);

    // ============================
    // CLEAR CACHE
    // ============================
    await redis.del("videocourses");
    await redis.del(`videocourse:${item.id}`);
    await redis.del(`videocourses:batch:${item.batchId}`);

    return res.json({
      success: true,
      message: "Video course updated successfully",
      data: item,
    });
  } catch (error) {
    console.error("VideoCourse Update Error:", error);
    return res.status(500).json({
      success: false,
      message: "Update failed",
    });
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
