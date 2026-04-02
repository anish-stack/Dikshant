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

    const batchId = Number(req.body.batchId);

    /* ================= POSITION HANDLING ================= */

    let position = Number(req.body.position);

    if (!position || position < 1) {
      const maxPosition = await VideoCourse.max("position", {
        where: { batchId },
      });

      position = (maxPosition || 0) + 1;
    }

    const existingVideo = await VideoCourse.findOne({
      where: {
        batchId,
        position,
      },
      attributes: ["id", "title", "position"],
    });

    if (existingVideo) {
      const maxPosition = await VideoCourse.max("position", {
        where: { batchId },
      });

      return res.status(400).json({
        success: false,
        message: `Position ${position} is already used by video "${existingVideo.title}" ${(maxPosition || 0) + 1}.`,
        suggestedPosition: (maxPosition || 0) + 1,
      });
    }

    /* ================= LIVE VALIDATION ================= */

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

    /* ================= IMAGE ================= */

    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadToS3(req.file, "videocourses");
    }

    /* ================= PAYLOAD ================= */

    const payload = {
      title: req.body.title.trim(),
      videoSource: req.body.videoSource,
      url: req.body.url.trim(),

      batchId,
      subjectId: Number(req.body.subjectId),

      position, // ⭐ added

      isDownloadable:
        req.body.isDownloadable === true ||
        req.body.isDownloadable === "true",

      isDemo:
        req.body.isDemo === true ||
        req.body.isDemo === "true",

      isLive,
      DateOfLive: isLive ? req.body.DateOfLive : null,
      TimeOfLIve: isLive ? req.body.TimeOfLIve : null,

      dateOfClass: req.body.dateOfClass ?? null,
      TimeOfClass: req.body.TimeOfClass ?? null,

      status: "active",
      imageUrl,
    };

    /* ================= CREATE VIDEO ================= */

    const item = await VideoCourse.create(payload);

    /* ================= TOKEN ================= */

    const secureToken = encryptVideoPayload({
      videoId: item.id,
      batchId: item.batchId,
      videoSource: item.videoSource,
      exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    await item.update({ secureToken });

    /* ================= CACHE CLEAR ================= */

    const redis = require("../config/redis");

    await redis.del("videocourses");
    await redis.del(`videocourses:batch:${batchId}`);

    /* ================= RESPONSE ================= */

    return res.status(201).json({
      success: true,
      message: "Video course created successfully",
      data: {
        ...item.toJSON(),
        secureToken,
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
     
      const items = await VideoCourse.findAll();
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

      // -----------------------------
      // 1) Primary fetch: by batchId
      // -----------------------------
      let whereCondition = { batchId: id };

      // ✅ Apply search only for admin
      if (isAdmin && search) {
        whereCondition.title = { [Op.like]: `%${search}%` };
      }

      const buildQueryOptions = (where) => {
        const queryOptions = {
          where,
          order: [["position", "ASC"]],
        };

        if (isAdmin) {
          queryOptions.limit = limit;
          queryOptions.offset = offset;
        }

        return queryOptions;
      };

      let result = await VideoCourse.findAndCountAll(buildQueryOptions(whereCondition));
      const normalizeSubjectIds = (raw) => {
        if (raw == null) return [];

        let val = raw;

        // Step 1: Handle common string-wrapped cases
        if (typeof val === 'string') {
          let s = val.trim();

          // Case: '"[51]"' or "'[51]'" → remove outer quotes
          if (
            (s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))
          ) {
            s = s.slice(1, -1).trim();
          }

          // Now try to parse as JSON
          try {
            val = JSON.parse(s);
          } catch (_) {
            // If not JSON, keep as string (e.g. "51")
            val = s;
          }
        }

        // Step 2: Flatten if nested arrays or weird structures
        const flatten = (arr) => {
          return arr.reduce((acc, item) => {
            if (Array.isArray(item)) {
              acc.push(...flatten(item));
            } else {
              acc.push(item);
            }
            return acc;
          }, []);
        };

        if (Array.isArray(val)) {
          val = flatten(val);
        } else {
          val = [val];
        }

        // Step 3: Clean to numbers only, dedupe
        const numbers = [...new Set(
          val
            .map((x) => {
              if (x == null) return null;
              if (typeof x === 'string') x = x.trim();
              const n = Number(x);
              return Number.isFinite(n) ? n : null;
            })
            .filter((x) => x !== null)
        )];

        return numbers;
      };
      // ---------------------------------------------------
      // 2) Fallback: if no videos in this batchId
      //    fetch by subjectIds from Batch.subjectId (JSON)
      // ---------------------------------------------------
      if (result.rows.length === 0) {
        const batch = await Batch.findByPk(id);

        // If batch not found, return empty (or 404 if you want)
        if (!batch) {
          return res.json({
            success: true,
            data: [],
            ...(isAdmin && {
              pagination: { total: 0, page, limit, totalPages: 0 },
            }),
          });
        }

        // Batch.subjectId can be array or single value
        let subjectIds = normalizeSubjectIds(batch.subjectId);



        // If no subject ids, return empty
        if (subjectIds.length === 0) {
          return res.json({
            success: true,
            data: [],
            ...(isAdmin && {
              pagination: { total: 0, page, limit, totalPages: 0 },
            }),
          });
        }

        // Build fallback where (any batch) by subjectId list
        const fallbackWhere = {
          subjectId: { [Op.in]: subjectIds },
        };

        // ✅ Apply admin search on title in fallback as well
        if (isAdmin && search) {
          fallbackWhere.title = { [Op.like]: `%${search}%` };
        }

        result = await VideoCourse.findAndCountAll(buildQueryOptions(fallbackWhere));
      }

      const { rows: items, count } = result;

      if (!items || items.length === 0) {
        return res.json({
          success: true,
          data: [],
          ...(isAdmin && {
            pagination: {
              total: count || 0,
              page,
              limit,
              totalPages: Math.ceil((count || 0) / limit),
            },
          }),
        });
      }

      // -----------------------------
      // 3) Map response + secureToken
      // -----------------------------
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
            position: video.position,
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

    /* ================= HELPERS ================= */

    const toBool = (val) =>
      val === true || val === "true" || val === 1 || val === "1";

    const toIntOrNull = (val) => {
      if (val === undefined || val === null || val === "") return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };

    const normalizeDate = (val) => {
      if (val === undefined) return undefined;
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

    /* ================= DATE INPUT FIX ================= */

    const incomingDateOfLive =
      req.body.DateOfLive ?? req.body.dateOfLive;

    const incomingTimeOfLive =
      req.body.TimeOfLive ?? req.body.TimeOfLIve ?? req.body.timeOfLive;

    const incomingDateOfClass =
      req.body.dateOfClass ?? req.body.DateOfClass;

    const incomingTimeOfClass =
      req.body.TimeOfClass ?? req.body.timeOfClass;

    /* ================= BOOLEAN FLAGS ================= */

    const isDemo =
      req.body.isDemo !== undefined ? toBool(req.body.isDemo) : item.isDemo;

    const isLive =
      req.body.isLive !== undefined ? toBool(req.body.isLive) : item.isLive;

    const isLiveEnded =
      req.body.isLiveEnded !== undefined
        ? toBool(req.body.isLiveEnded)
        : item.isLiveEnded;

    const shouldClearDates = isLive === false;

    /* ================= LIVE VALIDATION ================= */

    if (isLive === true && isDemo === false) {

      const finalDate = incomingDateOfLive ?? item.DateOfLive;

      const finalTime =
        incomingTimeOfLive ?? item.TimeOfLive ?? item.TimeOfLIve;

      if (!finalDate) {
        return res.status(400).json({
          success: false,
          message: "DateOfLive is required when isLive is true",
        });
      }

      if (!finalTime) {
        return res.status(400).json({
          success: false,
          message: "TimeOfLive is required when isLive is true",
        });
      }
    }

    /* ================= IMAGE ================= */

    let imageUrl = item.imageUrl;

    if (req.file) {
      if (item.imageUrl) {
        await deleteFromS3(item.imageUrl);
      }

      imageUrl = await uploadToS3(req.file, "videocourses");
    }

    /* ================= BATCH ================= */

    const batchId =
      req.body.batchId !== undefined
        ? Number(req.body.batchId)
        : item.batchId;

    /* ================= POSITION VALIDATION ================= */

    let position =
      req.body.position !== undefined
        ? Number(req.body.position)
        : item.position;

    if (req.body.position !== undefined) {

      if (!position || position < 1) {

        const maxPosition = await VideoCourse.max("position", {
          where: { batchId },
        });

        position = (maxPosition || 0) + 1;
      }

      const existingVideo = await VideoCourse.findOne({
        where: {
          batchId,
          position,
          id: { [Op.ne]: item.id },
        },
        attributes: ["id", "title", "position"],
      });

      if (existingVideo) {

        const maxPosition = await VideoCourse.max("position", {
          where: { batchId },
        });

        return res.status(400).json({
          success: false,
          message: `Position ${position} is already used by video "${existingVideo.title} - Available position: ${(maxPosition || 0) + 1}".`,
          suggestedPosition: (maxPosition || 0) + 1,
        });
      }
    }

    /* ================= UPDATE PAYLOAD ================= */

    const updateData = {

      title: trimOrUndefined(req.body.title) ?? item.title,

      videoSource: req.body.videoSource ?? item.videoSource,

      url: trimOrUndefined(req.body.url) ?? item.url,

      batchId,

      subjectId:
        req.body.subjectId !== undefined
          ? toIntOrNull(req.body.subjectId)
          : item.subjectId,

      position,

      isDownloadable:
        req.body.isDownloadable !== undefined
          ? toBool(req.body.isDownloadable)
          : item.isDownloadable,

      isDemo,
      isLive,
      isLiveEnded,

      DateOfLive: shouldClearDates
        ? null
        : normalizeDate(incomingDateOfLive) !== undefined
          ? normalizeDate(incomingDateOfLive)
          : item.DateOfLive,

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

      LiveEndAt:
        req.body.isLiveEnded !== undefined && toBool(req.body.isLiveEnded)
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

    /* ================= UPDATE ================= */

    await item.update(updateData);

    /* ================= CACHE CLEAR ================= */

    await redis.del("videocourses");
    await redis.del(`videocourse:${item.id}`);
    await redis.del(`videocourses:batch:${batchId}`);

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
      return res.status(404).json({
        success: false,
        message: "Video course not found"
      });
    }

    if (item.imageUrl) {
      await deleteFromS3(item.imageUrl);
    }

    const batchId = item.batchId;

    // DELETE VIDEO
    await item.destroy();

    /* ================= REORDER POSITIONS (BATCH-WISE) ================= */

    const videos = await VideoCourse.findAll({
      where: { batchId },
      order: [["position", "ASC"]]
    });

    for (let i = 0; i < videos.length; i++) {
      await videos[i].update({ position: i + 1 });
    }

    /* ================= CLEAR CACHE ================= */

    await Promise.all([
      redis.del("videocourses"),
      redis.del(`videocourse:${req.params.id}`),
      redis.del(`videocourses:batch:${batchId}`)
    ]);

    return res.json({
      success: true,
      message: "Video course deleted and positions reordered successfully"
    });

  } catch (error) {

    console.error("Delete Error:", error);

    return res.status(500).json({
      success: false,
      message: "Delete failed",
      error: error.message
    });
  }
}
}

module.exports = VideoCourseController;
