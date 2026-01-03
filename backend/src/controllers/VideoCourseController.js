"use strict";

const { VideoCourse, Order, Coupon, Batch, Program, Subject, } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { encryptVideoPayload, decryptVideoToken } = require("../utils/videoCrypto");
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
        dateOfClass:
          req.body.dateOfClass ?? null,

        TimeOfClass: req.body.TimeOfClass ?? null,

        status: "active",
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

 static async FindByBathId(req, res) {
  try {
    const isAdmin = req.query.admin === "true"; 
    const { id } = req.params;

    const items = await VideoCourse.findAll({
      where: { batchId: id },
      order: [["createdAt", "ASC"]],
    });

    const response = items.map((video) => {
      let secureToken = null;

      if (!isAdmin) {
        secureToken = encryptVideoPayload({
          videoUrl: video.url,
          videoId: video.id,
          batchId: video.batchId,
          videoSource: video.videoSource,
          exp: Date.now() + 15 * 60 * 1000, // 15 min
        });
      }

      return {
        id: video.id,
        title: video.title,
        imageUrl: video.imageUrl,
        videoSource: video.videoSource,

        batchId: video.batchId,
        subjectId: video.subjectId,

        isDownloadable: video.isDownloadable,
        isDemo: video.isDemo,
        status: video.status,

        isLive: video.isLive,
        isLiveEnded: video.isLiveEnded,
        LiveEndAt: video.LiveEndAt,
        DateOfLive: video.DateOfLive,
        TimeOfLIve: video.TimeOfLIve,

        dateOfClass: video.dateOfClass,
        TimeOfClass: video.TimeOfClass,

        createdAt: video.createdAt,

        // 🔐 admin → direct url, user → secure token
        ...(isAdmin
          ? { url: video.url }
          : { secureToken }),
      };
    });

    return res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}



  static async decryptAndPassVideo(req, res) {
    try {
      const { token } = req.body;
      const userId = req.params.userId;

      if (!token || !userId) {
        return res.status(400).json({ message: "Token & userId required" });
      }

      let payload;

      // 🔓 Try decrypt
      try {
        payload = decryptVideoToken(token);
      } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
      }

      const { videoId, batchId, exp } = payload;
      console.log("Payload",payload)
      // 🔍 Check video exists
      const video = await VideoCourse.findOne({
        where: {
          id: videoId,
          batchId,
          status: "active",
        },
      });
           console.log("Video Payload",video)



      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // 🔐 CHECK USER ACCESS (MOST IMPORTANT)
      const hasAccess = await Order.findOne({
        where: {
          userId,
          type: "batch",
          itemId: batchId,
          status: "success", // or completed
        },
      });
                  console.log(hasAccess)


      // Demo / Free logic
      if (!hasAccess && !video.isDemo) {
        return res.status(403).json({
          message: "You do not have access to this batch",
        });
      }

      // 🔄 TOKEN REFRESH LOGIC
      let refreshedToken = null;

      if (exp < Date.now()) {
        // ⏱ Token expired → issue NEW token
        refreshedToken = encryptVideoPayload({
          videoUrl: video.url,
          videoId: video.id,
          batchId: video.batchId,
          videoSource: video.videoSource,
          exp: Date.now() + 30 * 60 * 1000, // new 30 min
        });
      }

      // 🎥 SUCCESS RESPONSE
      return res.json({
        success: true,
        videoUrl: video.url,
        videoSource: video.videoSource,
        videoId: video.id,

        // 👇 frontend can store updated token
        refreshedToken,
      });
    } catch (err) {
      console.error("Video decrypt error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }


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

        dateOfClass:
          req.body.dateOfClass ?? item.dateOfClass,

        TimeOfClass: req.body.TimeOfClass ?? item.TimeOfClass,

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
