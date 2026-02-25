"use strict";

const { VideoCourse, Order, Coupon, Batch, Program, Subject, } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { encryptVideoPayload, decryptVideoToken } = require("../utils/videoCrypto");
const { Op } = require("sequelize");
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


static async FindByBatchId(req, res) {
  try {
    const isAdmin = req.query.admin === "true";
    const { id } = req.params;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search ? req.query.search.trim() : null;
    const offset = (page - 1) * limit;

    // ✅ Base where condition
    let whereCondition = {
      batchId: id,
    };

    // ✅ Apply search only for admin
    if (isAdmin && search) {
      whereCondition.title = {
        [Op.like]: `%${search}%`,
      };
    }

    let queryOptions = {
      where: whereCondition,
      order: [["createdAt", "ASC"]],
    };

    if (isAdmin) {
      queryOptions.limit = limit;
      queryOptions.offset = offset;
    }

    const { rows: items, count } = await VideoCourse.findAndCountAll(queryOptions);

    if (items.length === 0) {
      return res.json({
        success: true,
        data: [],
        ...(isAdmin && {
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
          },
        }),
      });
    }

    const response = await Promise.all(
      items.map(async (video) => {
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
          } catch (err) {
            console.error(`Token save failed for video ${video.id}`, err);
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

          secureToken,
          ...(isAdmin ? { url: video.url } : {}),
        };
      })
    );

    return res.json({
      success: true,
      data: response,
      ...(isAdmin && {
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      }),
    });

  } catch (error) {
    console.error("FindByBatchId error:", error);
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

      const toIntOrNull = (val) => {
        if (val === undefined || val === null || val === "") return null;
        const n = Number(val);
        return Number.isFinite(n) ? n : null;
      };

      const normalizeDate = (val) => {
        if (val === undefined) return undefined; // important (means: not provided)
        if (!val || val === "null" || val === "0000-00-00") return null;
        return val;
      };

      const normalizeTime = (val) => {
        if (val === undefined) return undefined;
        if (!val || val === "null" || val === "00:00:00") return null;
        return val;
      };

      const trimOrUndefined = (val) => {
        if (val === undefined || val === null) return undefined;
        if (typeof val !== "string") return val;
        return val.trim();
      };

      // ============================
      // FIX: accept both keys
      // ============================
      const incomingDateOfLive =
        req.body.DateOfLive ?? req.body.dateOfLive ?? req.body.dateOfLive;

      const incomingTimeOfLive =
        req.body.TimeOfLive ?? req.body.TimeOfLIve ?? req.body.timeOfLive;

      const incomingDateOfClass =
        req.body.dateOfClass ?? req.body.DateOfClass;

      const incomingTimeOfClass =
        req.body.TimeOfClass ?? req.body.timeOfClass;

      // ============================
      // RESOLVE FINAL BOOL FLAGS
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
      // Demo video OR not live => live dates not needed
      const shouldClearDates = isLive === false;

      // ============================
      // VALIDATION
      // ============================
      // If Live AND not demo => Date + Time required
      if (isLive === true && isDemo === false) {
        const finalDate = incomingDateOfLive ?? item.DateOfLive;
        const finalTime =
          incomingTimeOfLive ?? item.TimeOfLive ?? item.TimeOfLIve;

        if (!finalDate || finalDate === "null") {
          return res.status(400).json({
            success: false,
            message: "DateOfLive is required when isLive is true and isDemo is false",
          });
        }

        if (!finalTime || finalTime === "null") {
          return res.status(400).json({
            success: false,
            message: "TimeOfLive is required when isLive is true and isDemo is false",
          });
        }
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
      // BUILD UPDATE PAYLOAD
      // ============================
      const updateData = {
        title: trimOrUndefined(req.body.title) ?? item.title,
        videoSource: req.body.videoSource ?? item.videoSource,
        url: trimOrUndefined(req.body.url) ?? item.url,

        batchId:
          req.body.batchId !== undefined
            ? toIntOrNull(req.body.batchId)
            : item.batchId,

        subjectId:
          req.body.subjectId !== undefined
            ? toIntOrNull(req.body.subjectId)
            : item.subjectId,

        isDownloadable:
          req.body.isDownloadable !== undefined
            ? toBool(req.body.isDownloadable)
            : item.isDownloadable,

        isDemo,
        isLive,
        isLiveEnded,

        // ============================
        // LIVE DATE/TIME
        // ============================
        DateOfLive: shouldClearDates
          ? null
          : normalizeDate(incomingDateOfLive) !== undefined
            ? normalizeDate(incomingDateOfLive)
            : item.DateOfLive,

        // IMPORTANT: update both fields to be safe
        TimeOfLive: shouldClearDates
          ? null
          : normalizeTime(incomingTimeOfLive) !== undefined
            ? normalizeTime(incomingTimeOfLive)
            : item.TimeOfLive,

        TimeOfLIve: shouldClearDates
          ? null
          : normalizeTime(incomingTimeOfLive) !== undefined
            ? normalizeTime(incomingTimeOfLive)
            : item.TimeOfLIve,

        // ============================
        // CLASS DATE/TIME
        // ============================
        dateOfClass: shouldClearDates
          ? null
          : normalizeDate(incomingDateOfClass) !== undefined
            ? normalizeDate(incomingDateOfClass)
            : item.dateOfClass,

        TimeOfClass: shouldClearDates
          ? null
          : normalizeTime(incomingTimeOfClass) !== undefined
            ? normalizeTime(incomingTimeOfClass)
            : item.TimeOfClass,

        // ============================
        // LIVE END AT
        // ============================
        LiveEndAt:
          req.body.isLiveEnded !== undefined && toBool(req.body.isLiveEnded) === true
            ? new Date()
            : item.LiveEndAt,

        // ============================
        // STATUS
        // ============================
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
