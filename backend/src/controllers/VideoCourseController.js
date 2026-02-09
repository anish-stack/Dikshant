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
            message: "DateOfLive and TimeOfLIve are required when the video is live",
          });
        }
      }

      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadToS3(req.file, "videocourses");
      }

      const payload = {
        title: req.body.title.trim(),
        videoSource: req.body.videoSource,
        url: req.body.url.trim(),
        batchId: Number(req.body.batchId),
        subjectId: Number(req.body.subjectId),
        isDownloadable: req.body.isDownloadable === true || req.body.isDownloadable === "true",
        isDemo: req.body.isDemo === true || req.body.isDemo === "true",
        isLive,
        DateOfLive: isLive ? req.body.DateOfLive : null,
        TimeOfLIve: isLive ? req.body.TimeOfLIve : null,
        dateOfClass: req.body.dateOfClass ?? null,
        TimeOfClass: req.body.TimeOfClass ?? null,
        status: "active",
        imageUrl,
      };

      // CREATE VIDEO FIRST → video.id milega
      const item = await VideoCourse.create(payload);

      // GENERATE STABLE SECURE TOKEN USING DETERMINISTIC ENCRYPTION

      const secureToken = encryptVideoPayload({
        videoId: item.id,
        batchId: item.batchId,
        videoSource: item.videoSource,
        // Long expiry (1 year) – since token is stable, no need for short expiry
        exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
      });

      // UPDATE VIDEO WITH STABLE TOKEN (Optional but Recommended)
      await item.update({ secureToken });

      // CLEAR CACHE
      const redis = require("../config/redis"); // adjust path
      await redis.del("videocourses");
      await redis.del(`videocourses:batch:${payload.batchId}`);

      // RETURN WITH TOKEN
      return res.status(201).json({
        success: true,
        message: "Video course created successfully",
        data: {
          ...item.toJSON(),
          secureToken, // frontend ko bhi dikhao
        },
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

      let items = await VideoCourse.findAll({
        where: { batchId: id },
        order: [["createdAt", "ASC"]],
      });

      if (items.length === 0) {
        return res.json({
          success: true,
          data: [],
        });
      }

      const response = await Promise.all(
        items.map(async (video) => {

          // // ✅ DEMO VIDEO: direct url (no token)
          // if (video.isDemo === true) {
          //   return {
          //     id: video.id,
          //     title: video.title,
          //     imageUrl: video.imageUrl,
          //     videoSource: video.videoSource,

          //     batchId: video.batchId,
          //     subjectId: video.subjectId,

          //     isDownloadable: video.isDownloadable,
          //     isDemo: video.isDemo,
          //     status: video.status,

          //     isLive: video.isLive,
          //     isLiveEnded: video.isLiveEnded,
          //     LiveEndAt: video.LiveEndAt,
          //     DateOfLive: video.DateOfLive,
          //     TimeOfLIve: video.TimeOfLIve,

          //     dateOfClass: video.dateOfClass,
          //     TimeOfClass: video.TimeOfClass,

          //     createdAt: video.createdAt,

          //     // ✅ direct url for demo (even non-admin)
          //     url: video.url,

          //     // demo video has no secureToken
          //     secureToken: null,
          //   };
          // }

          // ================================
          // 🔒 NON-DEMO VIDEO: token required
          // ================================
          let secureToken = video.secureToken;

          if (!secureToken) {
            secureToken = encryptVideoPayload({
              videoId: video.id,
              batchId: video.batchId,
              videoSource: video.videoSource,
              exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
            });

            try {
              await video.update({ secureToken });
              console.log(`Generated & saved secureToken for video ID: ${video.id}`);
            } catch (updateErr) {
              console.error(
                `Failed to save secureToken for video ${video.id}:`,
                updateErr
              );
            }
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

            // 🔒 guaranteed stable token
            secureToken,

            // ✅ Admin gets raw URL
            ...(isAdmin ? { url: video.url } : {}),
          };
        })
      );

      return res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("FindByBathId error:", error);
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
      try {
        payload = decryptVideoToken(token);
      } catch (e) {
        return res.status(401).json({ message: "Invalid or tampered token" });
      }

      const { videoId, batchId, exp, videoSource } = payload;

      // Video exists?
      const video = await VideoCourse.findOne({
        where: {
          id: videoId,
          batchId,
          status: "active",
        },
      });

      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }


      const hasAccess = await Order.findOne({
        where: {
          userId,
          type: "batch",
          itemId: batchId,
          status: "success",
        },
      });

      if (!hasAccess && !video.isDemo) {
        return res.status(403).json({
          message: "You do not have access to this batch",
        });
      }

      // Token refresh if expired
      let refreshedToken = null;
      if (exp && exp < Date.now()) {
        refreshedToken = encryptVideoPayload({
          videoId: video.id,
          batchId: video.batchId,
          videoSource: video.videoSource,
          exp: Date.now() + 30 * 60 * 1000, // new 30 min session
        });
      }

      return res.json({
        success: true,
        videoUrl: video.url,
        videoSource: video.videoSource,
        videoId: video.id,
        refreshedToken, // frontend can update if wants
      });
    } catch (err) {
      console.error("decryptAndPassVideo error:", err);
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

      const normalizeDate = (val) => {
        if (!val) return null;
        if (val === "0000-00-00") return null;
        return val;
      };

      const normalizeTime = (val) => {
        if (!val) return null;
        if (val === "00:00:00") return null;
        return val;
      };

      // ============================
      // SAFE FIELD RESOLUTION (IMPORTANT)
      // ============================
      const isDemo =
        req.body.isDemo !== undefined ? toBool(req.body.isDemo) : item.isDemo;

      const isLive =
        req.body.isLive !== undefined ? toBool(req.body.isLive) : item.isLive;

      const isLiveEnded =
        req.body.isLiveEnded !== undefined
          ? toBool(req.body.isLiveEnded)
          : item.isLiveEnded;

      // ============================
      // RULES
      // ============================
      const shouldClearDates = isDemo === true || isLive === false;

      // ============================
      // VALIDATION
      // ============================
      // Live video AND NOT demo => date/time required
      if (
        isLive === true &&
        isDemo === false &&
        ((!req.body.DateOfLive && !item.DateOfLive) ||
          (!req.body.TimeOfLIve && !item.TimeOfLIve))
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

        isDemo,
        isLive,
        isLiveEnded,

        // ============================
        // LIVE DATE/TIME (only for live + not demo)
        // ============================
        DateOfLive: shouldClearDates
          ? null
          : req.body.DateOfLive !== undefined
            ? normalizeDate(req.body.DateOfLive)
            : item.DateOfLive,

        TimeOfLIve: shouldClearDates
          ? null
          : req.body.TimeOfLIve !== undefined
            ? normalizeTime(req.body.TimeOfLIve)
            : item.TimeOfLIve,

        // ============================
        // CLASS DATE/TIME (optional)
        // ============================
        dateOfClass: shouldClearDates
          ? null
          : req.body.dateOfClass !== undefined
            ? normalizeDate(req.body.dateOfClass)
            : item.dateOfClass,

        TimeOfClass: shouldClearDates
          ? null
          : req.body.TimeOfClass !== undefined
            ? normalizeTime(req.body.TimeOfClass)
            : item.TimeOfClass,

        // ============================
        // Live End At
        // ============================
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
        error: error.message,
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
