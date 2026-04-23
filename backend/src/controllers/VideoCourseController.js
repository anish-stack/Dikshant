"use strict";

const { VideoCourse, Order, Coupon, Batch, Program, Subject, } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { encryptVideoPayload, decryptVideoToken } = require("../utils/videoCrypto");
const { Op } = require("sequelize");
const PositionService = require("../utils/position.service");
// const NotificationController = require("./NotificationController");

class VideoCourseController {

  /* ======================
      CREATE
  ====================== */


  static async create(req, res) {
    try {
      console.log("==== VideoCourse CREATE API HIT ====");

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
      const subjectId = Number(req.body.subjectId);

      // =====================================
      // GET BATCH
      // =====================================
      const batch = await Batch.findByPk(batchId);

      if (!batch) {
        return res.status(400).json({
          success: false,
          message: "Batch not found",
        });
      }

      // =====================================
      // POSITION
      // SAME batchId + subjectId
      // =====================================
      let position = null;

      if (batch.category === "recorded" || batch.category === "offline") {
        position =
          await PositionService.insert(
            VideoCourse,
            "position",
            req.body.position,
            {
              batchId,
              subjectId,
            }
          );
      }

      // =====================================
      // LIVE CHECK
      // =====================================
      const isLive =
        req.body.isLive === true ||
        req.body.isLive === "true";

      if (isLive) {
        if (
          !req.body.DateOfLive ||
          !req.body.TimeOfLIve
        ) {
          return res.status(400).json({
            success: false,
            message:
              "DateOfLive and TimeOfLIve required for live class",
          });
        }
      }

      // =====================================
      // IMAGE
      // =====================================
      let imageUrl = null;

      if (req.file) {
        imageUrl = await uploadToS3(
          req.file,
          "videocourses"
        );
      }

      // =====================================
      // CREATE
      // =====================================
      const payload = {
        title:
          req.body.title.trim(),

        videoSource:
          req.body.videoSource,

        url: req.body.url.trim(),

        batchId,
        subjectId,

        position,

        isDownloadable:
          req.body
            .isDownloadable ===
          true ||
          req.body
            .isDownloadable ===
          "true",

        isDemo:
          req.body.isDemo ===
          true ||
          req.body.isDemo ===
          "true",

        isLive,

        DateOfLive: isLive
          ? req.body.DateOfLive
          : null,

        TimeOfLIve: isLive
          ? req.body.TimeOfLIve
          : null,

        dateOfClass:
          req.body.dateOfClass ||
          null,

        TimeOfClass:
          req.body.TimeOfClass ||
          null,

        status: "active",
        isDeleted: false,
        statusDelete: 0,

        imageUrl,
      };

      const item =
        await VideoCourse.create(
          payload
        );

      // =====================================
      // TOKEN
      // =====================================
      const secureToken =
        encryptVideoPayload({
          videoId: item.id,
          batchId:
            item.batchId,
          subjectId:
            item.subjectId,
          videoSource:
            item.videoSource,
          exp:
            Date.now() +
            365 *
            24 *
            60 *
            60 *
            1000,
        });

      await item.update({
        secureToken,
      });

      // =====================================
      // CACHE CLEAR
      // =====================================
      await redis.del(
        "videocourses"
      );

      await redis.del(
        `videocourses:batch:${batchId}`
      );

      await redis.del(
        `videocourses:batch:${batchId}:subject:${subjectId}`
      );

      // =====================================
      // RESPONSE
      // =====================================
      return res.status(201).json({
        success: true,
        message:
          "Video created successfully",
        data: {
          ...item.toJSON(),
          secureToken,
        },
      });
    } catch (error) {
      console.log(
        "Create Error =>",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Server error",
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

      console.log("=== REQUEST START ===");
      console.log("Requested Batch ID:", id);
      console.log("Is Admin:", isAdmin);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search ? req.query.search.trim() : null;
      const offset = (page - 1) * limit;

      const subjectId = req.query.subjectId;
      const batchIdOfSubject = req.query.batchIdOfSubject;

      console.log("Pagination - Page:", page, "Limit:", limit, "Offset:", offset);
      console.log("Filters - Search:", search, "SubjectId:", subjectId, "BatchIdOfSubject:", batchIdOfSubject);

      const batch = await Batch.findByPk(id);

      console.log("=== BATCH LOOKUP ===");
      console.log("Batch Found:", batch ? "YES" : "NO");
      if (batch) {
        console.log("Batch ID from DB:", batch.id);
        console.log("Batch Category:", batch.category);
      }

      /* ===============================
         Order Condition
      =============================== */
      let orderCondition = [["position", "DESC"]];
      if (batch) {
        if (batch.category === "online") {
          orderCondition = [["DateOfLive", "DESC"], ["TimeOfLIve", "DESC"]];
          console.log("Order: ONLINE (by DateOfLive DESC, TimeOfLIve DESC)");
        } else if (batch.category === "offline") {
          orderCondition = [["dateOfClass", "ASC"], ["TimeOfClass", "ASC"]];
          console.log("Order: OFFLINE (by dateOfClass ASC, TimeOfClass ASC)");
        } else {
          orderCondition = [["position", "ASC"]];
          console.log("Order: DEFAULT (by position ASC)");
        }
      }

      /* ===============================
         Subject Filter Helper
         FIX: batchIdOfSubject optional — 
         if subjectId exists + (no batchIdOfSubject OR matches id) → filter
      =============================== */
      const shouldFilterSubject =
        subjectId &&
        (!batchIdOfSubject || Number(batchIdOfSubject) === Number(id));

      console.log("=== FILTER LOGIC ===");
      console.log("Should Filter Subject:", shouldFilterSubject);

      /* ===============================
         FALLBACK CONFIGURATION
         Set to true/false to enable/disable fallback logic
      =============================== */
      const doFallback = false;  // ✅ CHANGE THIS TO true/false
      console.log("Fallback Enabled:", doFallback);

      /* ===============================
         Primary WHERE
      =============================== */
      let whereCondition = { batchId: id };

      console.log("Initial WHERE (before filters):", JSON.stringify(whereCondition));

      if (shouldFilterSubject) {
        whereCondition.subjectId = Number(subjectId);
        console.log("Added Subject Filter:", whereCondition.subjectId);
      }

      if (isAdmin && search) {
        whereCondition.title = { [Op.like]: `%${search}%` };
        console.log("Added Search Filter:", search);
      }

      console.log("Final WHERE Condition:", JSON.stringify(whereCondition));

      /* ===============================
         Query Builder
      =============================== */
      const buildQueryOptions = (where) => {
        const opts = { where, paranoid: false, order: orderCondition };
        if (isAdmin) {
          opts.limit = limit;
          opts.offset = offset;
        }
        return opts;
      };

      console.log("=== DATABASE QUERY ===");
      let result = await VideoCourse.findAndCountAll(buildQueryOptions(whereCondition));

      console.log("Videos Found (Primary Query):", result.rows.length);
      console.log("Total Count (Primary Query):", result.count);

      /* ===============================
         Normalize Subject IDs (only used if fallback is enabled)
      =============================== */
      const normalizeSubjectIds = (raw) => {
        if (raw == null) return [];
        let val = raw;

        if (typeof val === "string") {
          let s = val.trim();
          if (
            (s.startsWith('"') && s.endsWith('"')) ||
            (s.startsWith("'") && s.endsWith("'"))
          ) {
            s = s.slice(1, -1).trim();
          }
          try { val = JSON.parse(s); } catch { val = s; }
        }

        const flatten = (arr) =>
          arr.reduce((acc, item) => {
            if (Array.isArray(item)) acc.push(...flatten(item));
            else acc.push(item);
            return acc;
          }, []);

        if (Array.isArray(val)) val = flatten(val);
        else val = [val];

        return [
          ...new Set(
            val
              .map((x) => {
                if (x == null) return null;
                if (typeof x === "string") x = x.trim();
                const n = Number(x);
                return Number.isFinite(n) ? n : null;
              })
              .filter((x) => x !== null)
          ),
        ];
      };

      /* ===============================
         Fallback if no videos (Optional)
      =============================== */
      if (doFallback && result.rows.length === 0) {
        console.log("=== FALLBACK TRIGGERED (No videos found) ===");

        if (!batch) {
          console.log("Batch does not exist. Returning empty array.");
          return res.json({
            success: true,
            data: [],
            ...(isAdmin && { pagination: { total: 0, page, limit, totalPages: 0 } }),
          });
        }

        const subjectIds = normalizeSubjectIds(batch.subjectId);
        console.log("Batch Subject IDs (normalized):", subjectIds);

        if (subjectIds.length === 0) {
          console.log("No subject IDs in batch. Returning empty array.");
          return res.json({
            success: true,
            data: [],
            ...(isAdmin && { pagination: { total: 0, page, limit, totalPages: 0 } }),
          });
        }

        // Same shouldFilterSubject logic in fallback
        let fallbackWhere = shouldFilterSubject
          ? { subjectId: Number(subjectId) }
          : { subjectId: { [Op.in]: subjectIds } };

        if (isAdmin && search) {
          fallbackWhere.title = { [Op.like]: `%${search}%` };
        }

        console.log("Fallback WHERE Condition:", JSON.stringify(fallbackWhere));
        console.log("Executing fallback query...");

        result = await VideoCourse.findAndCountAll(buildQueryOptions(fallbackWhere));

        console.log("Videos Found (Fallback Query):", result.rows.length);
        console.log("Total Count (Fallback Query):", result.count);
      } else if (result.rows.length === 0) {
        console.log("=== NO VIDEOS FOUND & FALLBACK DISABLED ===");
      }

      const { rows: items, count } = result;

      if (!items || items.length === 0) {
        console.log("=== FINAL RESULT: EMPTY ===");
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

      console.log("=== PROCESSING VIDEOS ===");
      console.log("Total Videos to Process:", items.length);

      /* ===============================
         Secure Token + Response Map
      =============================== */
      const response = await Promise.all(
        items.map(async (video, index) => {
          console.log(`Processing video ${index + 1}/${items.length}: ID=${video.id}, BatchId=${video.batchId}`);

          let secureToken = video.secureToken;

          if (!secureToken) {
            console.log(`  → Generating new token for video ${video.id}`);
            secureToken = encryptVideoPayload({
              videoId: video.id,
              batchId: video.batchId,
              videoSource: video.videoSource,
              exp: Date.now() + 365 * 24 * 60 * 60 * 1000,
            });
            try {
              await video.update({ secureToken });
              console.log(`  → Token saved successfully`);
            } catch (err) {
              console.error(`  → Token save failed for video ${video.id}:`, err.message);
            }
          } else {
            console.log(`  → Token already exists`);
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

      console.log("=== FINAL RESPONSE ===");
      console.log("Total Videos in Response:", response.length);
      console.log("Pagination Enabled:", isAdmin);
      if (isAdmin) {
        console.log("Pagination Details - Page:", page, "Limit:", limit, "Total:", count, "TotalPages:", Math.ceil(count / limit));
      }

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
      console.error("=== ERROR OCCURRED ===");
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }


  static async decryptAndPassVideo(req, res) {
    try {
      console.log("🔹 decryptAndPassVideo API called");

      const { token } = req.body;
      const userId = req.params.userId;

      console.log("Incoming Data:", { token, userId });

      if (!token || !userId) {
        console.log("❌ Token or userId missing");
        return res.status(400).json({ message: "Token & userId required" });
      }

      let payload;

      try {
        payload = decryptVideoToken(token);
        console.log("✅ Decrypted Payload:", payload);
      } catch (e) {
        console.log("❌ Token Decryption Failed:", e.message);
        return res.status(401).json({ message: "Invalid or tampered token" });
      }

      const { videoId, batchId, exp, videoSource } = payload;

      console.log("🔎 Searching video:", { videoId, batchId });

      // include soft deleted videos
      const video = await VideoCourse.findOne({
        where: {
          id: videoId,
          batchId,
          status: "active",
        },
        paranoid: false,
      });

      console.log("📹 Video Result:", video ? video.id : "NOT FOUND");

      if (!video) {
        console.log("❌ Video not found in DB");
        return res.status(404).json({ message: "Video not found" });
      }

      console.log("🔎 Checking user batch access");

      const hasAccess = await Order.findOne({
        where: {
          userId,
          type: "batch",
          itemId: batchId,
          status: "success",
        },
        paranoid: false,
      });

      console.log("📦 Access Result:", hasAccess ? "ACCESS GRANTED" : "NO ACCESS");

      if (!hasAccess && !video.isDemo) {
        console.log("❌ User does not own batch");
        return res.status(403).json({
          message: "You do not have access to this batch",
        });
      }

      // Token refresh
      let refreshedToken = null;

      if (exp && exp < Date.now()) {
        console.log("⏰ Token expired, generating new token");

        refreshedToken = encryptVideoPayload({
          videoId: video.id,
          batchId: video.batchId,
          videoSource: video.videoSource,
          exp: Date.now() + 30 * 60 * 1000,
        });
      }

      console.log("✅ Video access granted");

      return res.json({
        success: true,
        videoUrl: video.url,
        videoSource: video.videoSource,
        videoId: video.id,
        refreshedToken,
      });

    } catch (err) {
      console.error("🔥 decryptAndPassVideo error:", err);

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  static async update(req, res) {
    try {
      const item = await VideoCourse.findByPk(
        req.params.id
      );

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Video course not found",
        });
      }

      // =====================================
      // HELPERS
      // =====================================
      const toBool = (val) =>
        val === true ||
        val === "true" ||
        val === 1 ||
        val === "1";

      const toIntOrNull = (val) => {
        if (
          val === undefined ||
          val === null ||
          val === ""
        )
          return null;

        const n = Number(val);

        return Number.isFinite(n)
          ? n
          : null;
      };

      const trim = (val) => {
        if (
          val === undefined ||
          val === null
        )
          return undefined;

        return typeof val ===
          "string"
          ? val.trim()
          : val;
      };

      // =====================================
      // NEW IDS
      // =====================================
      const batchId =
        req.body.batchId !==
          undefined
          ? Number(
            req.body.batchId
          )
          : item.batchId;

      const subjectId =
        req.body.subjectId !==
          undefined
          ? Number(
            req.body.subjectId
          )
          : item.subjectId;

      // =====================================
      // BATCH
      // =====================================
      const batch =
        await Batch.findByPk(
          batchId
        );

      if (!batch) {
        return res.status(400).json({
          success: false,
          message:
            "Batch not found",
        });
      }

      // =====================================
      // IMAGE
      // =====================================
      let imageUrl =
        item.imageUrl;

      if (req.file) {
        if (item.imageUrl) {
          await deleteFromS3(
            item.imageUrl
          );
        }

        imageUrl =
          await uploadToS3(
            req.file,
            "videocourses"
          );
      }

      // =====================================
      // POSITION
      // SAME batch + subject
      // =====================================
      let position =
        item.position;

      if (
        batch.category ===
        "recorded" || batch.category === "offline"
      ) {
        position =
          await PositionService.swap(
            VideoCourse,
            item.id,
            "position",
            req.body.position,
            {
              batchId,
              subjectId,
            }
          );
      } else {
        position = null;
      }

      // =====================================
      // LIVE FLAGS
      // =====================================
      const isLive =
        req.body.isLive !==
          undefined
          ? toBool(
            req.body.isLive
          )
          : item.isLive;

      const isDemo =
        req.body.isDemo !==
          undefined
          ? toBool(
            req.body.isDemo
          )
          : item.isDemo;

      const isLiveEnded =
        req.body
          .isLiveEnded !==
          undefined
          ? toBool(
            req.body
              .isLiveEnded
          )
          : item.isLiveEnded;

      // =====================================
      // UPDATE DATA
      // =====================================
      const updateData = {
        title:
          trim(
            req.body.title
          ) || item.title,

        videoSource:
          req.body
            .videoSource ||
          item.videoSource,

        url:
          trim(req.body.url) ||
          item.url,

        batchId,
        subjectId,

        position,

        isDownloadable:
          req.body
            .isDownloadable !==
            undefined
            ? toBool(
              req.body
                .isDownloadable
            )
            : item.isDownloadable,

        isDemo,
        isLive,
        isLiveEnded,

        DateOfLive: isLive
          ? req.body
            .DateOfLive ||
          item.DateOfLive
          : null,

        TimeOfLIve: isLive
          ? req.body
            .TimeOfLIve ||
          item.TimeOfLIve
          : null,

        dateOfClass:
          req.body
            .dateOfClass ||
          item.dateOfClass,

        TimeOfClass:
          req.body
            .TimeOfClass ||
          item.TimeOfClass,

        LiveEndAt:
          isLiveEnded
            ? new Date()
            : item.LiveEndAt,

        status:
          req.body.status !==
            undefined
            ? req.body
              .status ===
              "active"
              ? "active"
              : "inactive"
            : item.status,

        imageUrl,
      };

      // =====================================
      // UPDATE
      // =====================================
      await item.update(
        updateData
      );

      // =====================================
      // CACHE CLEAR
      // =====================================
      await redis.del(
        "videocourses"
      );

      await redis.del(
        `videocourse:${item.id}`
      );

      await redis.del(
        `videocourses:batch:${batchId}`
      );

      await redis.del(
        `videocourses:batch:${batchId}:subject:${subjectId}`
      );

      return res.json({
        success: true,
        message:
          "Video course updated successfully",
        data: item,
      });
    } catch (error) {
      console.log(
        "Update Error =>",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Update failed",
      });
    }
  }

  static async delete(req, res) {
    try {
      console.log(
        "==== DELETE VIDEO API HIT ===="
      );

      const videoId =
        req.params.id;

      // =====================================
      // FIND VIDEO
      // =====================================
      const item =
        await VideoCourse.findByPk(
          videoId,
          {
            paranoid: false,
          }
        );

      if (!item) {
        return res.status(404).json({
          success: false,
          message:
            "Video course not found",
        });
      }

      const batchId =
        item.batchId;

      const subjectId =
        item.subjectId;

      const oldPosition =
        item.position;

      // =====================================
      // DELETE IMAGE
      // =====================================
      if (item.imageUrl) {
        try {
          await deleteFromS3(
            item.imageUrl
          );
        } catch (error) {
          console.log(
            "S3 Delete Error =>",
            error.message
          );
        }
      }

      // =====================================
      // HARD DELETE
      // =====================================
      await item.destroy({
        force: true,
      });

      // =====================================
      // REORDER POSITION
      // SAME batch + subject
      // =====================================
      const batch =
        await Batch.findByPk(
          batchId
        );

      if (
        batch &&
        batch.category ===
        "recorded" || batch.category === "offline"
      ) {
        const videos =
          await VideoCourse.findAll(
            {
              where: {
                batchId,
                subjectId,
              },
              order: [
                [
                  "position",
                  "ASC",
                ],
                [
                  "id",
                  "ASC",
                ],
              ],
            }
          );

        let counter = 1;

        for (const video of videos) {
          if (
            video.position !==
            counter
          ) {
            await video.update(
              {
                position:
                  counter,
              }
            );
          }

          counter++;
        }
      }

      // =====================================
      // CACHE CLEAR
      // =====================================
      await Promise.all([
        redis.del(
          "videocourses"
        ),

        redis.del(
          `videocourse:${videoId}`
        ),

        redis.del(
          `videocourses:batch:${batchId}`
        ),

        redis.del(
          `videocourses:batch:${batchId}:subject:${subjectId}`
        ),
      ]);

      // =====================================
      // RESPONSE
      // =====================================
      return res.json({
        success: true,
        message:
          "Video course permanently deleted",
      });
    } catch (error) {
      console.log(
        "Delete Error =>",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Delete failed",
      });
    }
  }
}

module.exports = VideoCourseController;
