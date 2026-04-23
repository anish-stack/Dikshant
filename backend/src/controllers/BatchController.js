"use strict";

const { Batch, Program, Subject, Sequelize, Quizzes, TestSeries, sequelize, Order } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { generateSlug } = require("../utils/helpers");
const { Op } = Sequelize;

const normalizeEmiSchedule = (emiSchedule) => {
  if (!emiSchedule) return null;

  // Already correct
  if (Array.isArray(emiSchedule)) return emiSchedule;

  try {
    let parsed = JSON.parse(emiSchedule);

    // Handle double-stringified JSON
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }

    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.error("Invalid EMI Schedule:", emiSchedule);
    return null;
  }
};

class BatchController {
  // =========================
  // CREATE
  // =========================
  static async create(req, res) {
    const t = await sequelize.transaction();

    try {
      /* ================= IMAGE ================= */
      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadToS3(req.file, "batchs");
      }

      /* ================= JSON NORMALIZE ================= */
      const quizIds =
        typeof req.body.quizIds === "string"
          ? JSON.parse(req.body.quizIds)
          : req.body.quizIds || [];

      const testSeriesIds =
        typeof req.body.testSeriesIds === "string"
          ? JSON.parse(req.body.testSeriesIds)
          : req.body.testSeriesIds || [];

      /* ================= SEPARATE PURCHASE SUBJECTS (NEW) ================= */
      let separatePurchaseSubjectIds = [];
      if (req.body.separatePurchaseSubjectIds) {
        try {
          separatePurchaseSubjectIds =
            typeof req.body.separatePurchaseSubjectIds === "string"
              ? JSON.parse(req.body.separatePurchaseSubjectIds)
              : req.body.separatePurchaseSubjectIds;

          if (Array.isArray(separatePurchaseSubjectIds)) {
            separatePurchaseSubjectIds = separatePurchaseSubjectIds.map((sub) => ({
              subjectId: Number(sub.subjectId),
              price: Number(sub.price) || 0,
              discountPrice: Number(sub.discountPrice) || 0,
              expiryDays: Number(sub.expiryDays) || 365,
              position: Number(sub.position) || 1,
              status: sub.status === "inactive" ? "inactive" : "active",
              tag: sub.tag || null,
            }));
          } else {
            separatePurchaseSubjectIds = [];
          }
        } catch (e) {
          console.error("Error parsing separatePurchaseSubjectIds:", e);
          separatePurchaseSubjectIds = [];
        }
      }

      const emiSchedule = normalizeEmiSchedule(req.body.emiSchedule);

      /* ================= DATE PARSING ================= */
      const parseDate = (value) => {
        if (!value || value === "" || value === "Invalid date") return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      };

      const registrationStart = parseDate(req.body.registrationStartDate);
      const registrationEnd = parseDate(req.body.registrationEndDate);
      const start = parseDate(req.body.startDate);
      const end = parseDate(req.body.endDate);

      if (registrationStart && registrationEnd && registrationEnd < registrationStart) {
        await t.rollback();
        return res.status(400).json({
          message: "Registration end date cannot be before start date",
        });
      }

      /* ================= POSITION HANDLING ================= */
      let position = Number(req.body.position);

      if (!position || position < 1) {
        const maxPosition = await Batch.max("position");
        position = (maxPosition || 0) + 1;
      } else {
        // Shift existing batches
        await Batch.increment(
          { position: 1 },
          {
            where: { position: { [Op.gte]: position } },
            transaction: t,
          }
        );
      }

      /* ================= PAYLOAD ================= */
      const payload = {
        name: req.body.name,
        slug: generateSlug(req.body.name),
        imageUrl,

        displayOrder: req.body.displayOrder,
        position,

        programId: req.body.programId,
        subjectId: req.body.subjectId,

        // ✅ New Field: Separate Purchase Subjects
        separatePurchaseSubjectIds: separatePurchaseSubjectIds,

        medium: req.body.medium || "",
        offerText: req.body.offerText,
        fee_one_time: req.body.fee_one_time,
        fee_inst: req.body.fee_inst,
        note: req.body.note,

        startDate: start,
        endDate: end,
        registrationStartDate: registrationStart,
        registrationEndDate: registrationEnd,

        status: req.body.status,
        shortDescription: req.body.shortDescription,
        longDescription: req.body.longDescription,

        batchPrice: req.body.batchPrice,
        batchDiscountPrice: req.body.batchDiscountPrice,
        gst: req.body.gst,
        offerValidityDays: req.body.offerValidityDays,

        quizIds: Array.isArray(quizIds) ? quizIds : [],
        testSeriesIds: Array.isArray(testSeriesIds) ? testSeriesIds : [],

        isEmi: Boolean(req.body.isEmi),
        emiTotal: req.body.emiTotal || null,
        emiSchedule,

        category: req.body.category,
      };

      const item = await Batch.create(payload, { transaction: t });

      await t.commit();
      await BatchController.clearBatchCache();

      return res.status(201).json({
        success: true,
        message: "Batch created successfully",
        data: item,
      });

    } catch (err) {
      await t.rollback();
      console.error("Batch Create Error:", err);

      let userMessage = "Failed to create batch. Please try again.";
      let status = 500;

      if (err.name === "SequelizeDatabaseError") {
        if (err.parent?.sqlMessage?.includes("Incorrect datetime value")) {
          userMessage = "Invalid date format for start/end or registration dates.";
          status = 400;
        }
      } else if (err.name === "SequelizeValidationError") {
        userMessage = "Validation failed: " + err.errors.map((e) => e.message).join(", ");
        status = 400;
      }

      return res.status(status).json({
        message: userMessage,
        error: err.message,
      });
    }
  }
  // =========================
  // FIND ALL
  // =========================
  static async findAll(req, res) {
    try {
      let {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        category = "",
        medium = ""
      } = req.query;

      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;

      // Build dynamic where clause
      const where = {};

      // Search filter (multi-field)
      if (search && search.trim()) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search.trim()}%` } },
          { shortDescription: { [Op.like]: `%${search.trim()}%` } },
          { longDescription: { [Op.like]: `%${search.trim()}%` } },
        ];
      }

      // Status filter
      if (status && status.trim()) {
        where.status = status.trim();
      }

      // Category filter (online / offline / recorded)
      if (category && category.trim()) {
        where.category = category.trim();
      }

      // Medium filter
      if (medium && medium.trim()) {
        where.medium = medium.trim();
      }

      const result = await Batch.findAndCountAll({
        where,
        limit,
        offset,
        attributes: {
          exclude: ["longDescription"]
        },
        order: [["position", "ASC"]],
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name", "slug"],
          },
        ],
      });
      const parseSubjectIds = (raw) => {
        if (!raw) return [];

        let parsed = raw;

        try {
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }

          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }

        } catch (e) {
          console.error("SubjectId parse error:", e);
          return [];
        }

        if (!Array.isArray(parsed)) return [];

        return parsed.map((id) => Number(id)).filter((n) => Number.isInteger(n));
      };
      // Enrich each batch with subjects
      const batchItems = await Promise.all(
        result.rows.map(async (batch) => {

          const subjectIds = parseSubjectIds(batch.subjectId);


          const subjectsList = await Subject.findAll({
            where: { id: subjectIds },
            attributes: ["id", "name", "slug", "description"],
          });
       
          /* ---------- Map for quick lookup ---------- */

          const subjectMap = {};
          subjectsList.forEach((s) => {
            subjectMap[s.id] = s.name;
          });

          /* ---------- Add subject name to separatePurchaseSubjectIds ---------- */

          const separateSubjects = (batch.separatePurchaseSubjectIds || []).map(
            (s) => ({
              ...s,
              subjectName: subjectMap[s.subjectId] || null,
            })
          );

          return {
            ...batch.toJSON(),
            subjects: subjectsList,
            separatePurchaseSubjectIds: separateSubjects,
          };
        })
      );

      const response = {
        total: result.count,
        page,
        limit,
        pages: Math.ceil(result.count / limit),
        items: batchItems,
      };

      // Optional: Add Redis caching later
      // await redis.set(redisKey, JSON.stringify(response), "EX", 60);

      return res.json(response);
    } catch (err) {
      console.error("Batch Fetch Error:", err);
      return res.status(500).json({
        message: "Error fetching batches",
        error: err.message,
      });
    }
  }

  static async ForHomeScreen(req, res) {
    try {
      const batchAttributes = [
        "id",
        "name",
        "slug",
        "imageUrl",
        "displayOrder",
        "programId",
        "medium",
        "offerText",
        "fee_one_time",
        "fee_inst",
        "note",
        "batchPrice",
        "batchDiscountPrice",
        "position",
        "category",
        "c_status"
      ];
      // 7 batches per category
      const onlineBatches = await Batch.findAll({
        where: {
          category: "online",
          status: "active"
        },
        attributes: batchAttributes,
        limit: 7,
        order: [["position", "ASC"]],
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name", "slug"]
          }
        ]
      });

      const recordedBatches = await Batch.findAll({
        where: {
          category: "recorded",
          status: "active"
        },
        attributes: batchAttributes,
        limit: 7,
        order: [["position", "ASC"]],
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name", "slug"]
          }
        ]
      });

      const offlineBatches = await Batch.findAll({
        where: {
          category: "offline",
          status: "active"
        },
        attributes: batchAttributes,
        limit: 7,
        order: [["position", "ASC"]],
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name", "slug"]
          }
        ]
      });

      // Helper function to attach subjects
      const attachSubjects = async (batches) => {
        return Promise.all(
          batches.map(async (batch) => {

            let subjectIds = [];

            try {
              subjectIds = JSON.parse(batch.subjectId || "[]");
            } catch {
              subjectIds = [];
            }

            const subjects = await Subject.findAll({
              where: { id: subjectIds },
              attributes: ["id", "name", "slug"]
            });

            return {
              ...batch.toJSON(),
              subjects
            };
          })
        );
      };

      const response = {
        online: await attachSubjects(onlineBatches),
        recorded: await attachSubjects(recordedBatches),
        offline: await attachSubjects(offlineBatches)
      };

      return res.json({
        success: true,
        data: response
      });

    } catch (error) {

      console.error("Home Screen Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error fetching home data"
      });

    }
  }
  // =========================
  // FIND ONE
  // =========================
static async findOne(req, res) {
  try {
    const id = req.params.id;

    const item = await Batch.findByPk(id, {
      include: [
        {
          model: Program,
          as: "program",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        message: "Batch not found",
      });
    }

    const { Op } = require("sequelize");

    /* =========================================
       Parse subjectId
    ========================================= */
    let subjectIds = [];

    try {
      let raw = item.subjectId;

      if (typeof raw === "string") {
        raw = JSON.parse(raw);
      }

      if (typeof raw === "string") {
        raw = JSON.parse(raw);
      }

      if (Array.isArray(raw)) {
        subjectIds = raw.map(Number);
      }
    } catch {
      subjectIds = [];
    }

    /* =========================================
       Subjects List
    ========================================= */
    let subjectsList = [];

    if (subjectIds.length) {
      const subjects = await Subject.findAll({
        where: {
          id: {
            [Op.in]: subjectIds,
          },
        },
        attributes: ["id", "name"],
      });

      const subjectMap = {};

      subjects.forEach((s) => {
        subjectMap[s.id] = s.name;
      });

      subjectsList = subjectIds
        .map((id) => ({
          id,
          name: subjectMap[id] || null,
        }))
        .filter((item) => item.name !== null); // remove null names
    }

    /* =========================================
       Separate Purchase Subjects
    ========================================= */
    let separatePurchaseSubjects = [];

    try {
      let rawSeparate = item.separatePurchaseSubjectIds;

      if (typeof rawSeparate === "string") {
        rawSeparate = JSON.parse(rawSeparate);
      }

      if (Array.isArray(rawSeparate)) {
        separatePurchaseSubjects = rawSeparate.map((sub) => ({
          subjectId: Number(sub.subjectId),
          price: Number(sub.price) || 0,
          discountPrice: Number(sub.discountPrice) || 0,
          expiryDays: Number(sub.expiryDays) || 365,
          position: Number(sub.position) || 1,
          status: sub.status || "active",
          tag: sub.tag || null,
        }));
      }
    } catch (e) {
      console.error(
        "Error parsing separatePurchaseSubjectIds:",
        e
      );
      separatePurchaseSubjects = [];
    }

    /* =========================================
       Final Response
    ========================================= */
    const response = {
      ...item.toJSON(),
      subjects: subjectsList,
      separatePurchaseSubjects,
    };

    delete response.subjectId;
    delete response.separatePurchaseSubjectIds;

    return res.json(response);
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching batch",
      error: err.message,
    });
  }
}
  static async findOneBySlug(req, res) {
    try {
      const slug = req.params.slug;
      // console.log("slug",slug)

      const item = await Batch.findOne({
        where: { slug },
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name", "slug"],
          },
        ],
      });

      if (!item) {
        return res.status(404).json({ message: "Batch not found" });
      }

      const { Op } = require("sequelize");

      let subjectIds = [];

      try {
        let raw = item.subjectId;

        // first parse
        if (typeof raw === "string") {
          raw = JSON.parse(raw);
        }

        // second parse
        if (typeof raw === "string") {
          raw = JSON.parse(raw);
        }

        if (Array.isArray(raw)) {
          subjectIds = raw.map(Number);
        }
      } catch (err) {
        subjectIds = [];
      }

      const subjectsList = subjectIds.length
        ? await Subject.findAll({
          where: {
            id: { [Op.in]: subjectIds },
          },
          attributes: ["id", "name"],
        })
        : [];

      const subjectNames = subjectsList.map((sub) => ({
        id: sub.id,
        name: sub.name,
      }));

      const response = {
        ...item.toJSON(),
        subjects: subjectNames,
      };

      return res.json(response);
    } catch (err) {
      console.error("Batch Fetch Error:", err);
      return res.status(500).json({
        message: "Error fetching batch",
        error: err.message,
      });
    }
  }


  static async findOneForStudent(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Batch ID is required" });
      }

      const { Op } = Sequelize;

      /* ================= Fetch Batch ================= */

      const batch = await Batch.findByPk(id, {
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name"],
          },
        ],
      });

      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }

      /* ================= Helper: Safe JSON Array Parse ================= */

      const parseIdArray = (raw) => {
        if (!raw) return [];

        let parsed = raw;

        try {
          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }

          if (typeof parsed === "string") {
            parsed = JSON.parse(parsed);
          }
        } catch {
          return [];
        }

        if (!Array.isArray(parsed)) return [];

        return parsed
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n));
      };

      /* ================= Parse IDs ================= */

      const subjectIds = parseIdArray(batch.subjectId);
      const quizIds = parseIdArray(batch.quizIds);
      const testSeriesIds = parseIdArray(batch.testSeriesIds);

      /* ================= Fetch Related Data ================= */

      const [subjects, quizzes, testSeries] = await Promise.all([
        subjectIds.length
          ? Subject.findAll({
            where: { id: { [Op.in]: subjectIds } },
            attributes: ["id", "name"],
            raw: true,
          })
          : [],

        quizIds.length
          ? Quizzes.findAll({
            where: { id: { [Op.in]: quizIds } },
            attributes: ["id", "title", "image", "price", "description"],
            raw: true,
          })
          : [],

        testSeriesIds.length
          ? TestSeries.findAll({
            where: { id: { [Op.in]: testSeriesIds } },
            attributes: ["id", "title", "imageUrl", "price", "description"],
            raw: true,
          })
          : [],
      ]);

      /* ================= Parse Separate Purchase Subjects ================= */

      let separatePurchaseSubjects = [];

      try {
        let rawSeparate = batch.separatePurchaseSubjectIds;

        if (typeof rawSeparate === "string") {
          rawSeparate = JSON.parse(rawSeparate);
        }

        if (Array.isArray(rawSeparate)) {
          separatePurchaseSubjects = rawSeparate.map((sub) => ({
            subjectId: Number(sub.subjectId),
            price: Number(sub.price) || 0,
            discountPrice: Number(sub.discountPrice) || 0,
            expiryDays: Number(sub.expiryDays) || 365,
            position: Number(sub.position) || 1,
            status: sub.status || "active",
            tag: sub.tag || null,
          }));
        }
      } catch (error) {
        console.error("Error parsing separatePurchaseSubjectIds:", error);
        separatePurchaseSubjects = [];
      }

      /* ================= Check User Purchases ================= */

      let isBatchPurchased = false;
      let purchasedSubjectIds = [];

      if (userId) {
        const userOrders = await Order.findAll({
          where: {
            userId,
            status: "success",
            type: {
              [Op.in]: ["batch", "subject"],
            },
          },
          attributes: ["type", "itemId"],
          raw: true,
        });

        isBatchPurchased = userOrders.some(
          (order) => order.type === "batch" && order.itemId === Number(id)
        );

        purchasedSubjectIds = userOrders
          .filter((order) => order.type === "subject")
          .map((order) => order.itemId);
      }

      /* ================= Build Response ================= */

      const response = {
        ...batch.toJSON(),

        program: batch.program
          ? {
            id: batch.program.id,
            name: batch.program.name,
          }
          : null,

        subjects: subjects.map((s) => ({
          id: s.id,
          name: s.name,
        })),

        quizzes: quizzes.map((q) => ({
          id: q.id,
          title: q.title,
          image: q.image || null,
          price: q.price ?? null,
          description: q.description || null,
        })),

        testSeries: testSeries.map((ts) => ({
          id: ts.id,
          title: ts.title,
          imageUrl: ts.imageUrl || null,
          price: ts.price ?? null,
          description: ts.description || null,
        })),

        separatePurchaseSubjects,

        /* ⭐ Purchase Info */
        isBatchPurchased,
        purchasedSubjectIds,
      };

      /* ================= Remove Raw Fields ================= */


      delete response.separatePurchaseSubjectIds;

      return res.status(200).json(response);
    } catch (err) {
      console.error("Batch Fetch Error:", err);

      return res.status(500).json({
        message: "Error fetching batch details",
        error: err.message,
      });
    }
  }

  // =========================
  // UPDATE
  // =========================
  static async update(req, res) {
    try {
      const batchId = req.params.id;
      const item = await Batch.findByPk(batchId);
      console.log(req.body)
      if (!item) {
        return res.status(404).json({ message: "Batch not found" });
      }

      const { Op } = require("sequelize");

      /* ================= IMAGE ================= */
      let imageUrl = item.imageUrl;
      if (req.file) {
        if (item.imageUrl) {
          await deleteFromS3(item.imageUrl);
        }
        imageUrl = await uploadToS3(req.file, "batchs");
      }

      /* ================= NORMALIZE ARRAYS ================= */
      const quizIds =
        typeof req.body.quizIds === "string"
          ? JSON.parse(req.body.quizIds)
          : req.body.quizIds || [];

      const testSeriesIds =
        typeof req.body.testSeriesIds === "string"
          ? JSON.parse(req.body.testSeriesIds)
          : req.body.testSeriesIds || [];

      /* ================= SUBJECTS ================= */
      let subjectIds =
        typeof req.body.subjectId === "string"
          ? JSON.parse(req.body.subjectId)
          : req.body.subjectId || [];
      subjectIds = Array.isArray(subjectIds) ? subjectIds.map(Number) : [];

      /* ================= SEPARATE PURCHASE SUBJECTS (NEW) ================= */
      let separatePurchaseSubjectIds = [];
      if (req.body.separatePurchaseSubjectIds) {
        try {
          separatePurchaseSubjectIds =
            typeof req.body.separatePurchaseSubjectIds === "string"
              ? JSON.parse(req.body.separatePurchaseSubjectIds)
              : req.body.separatePurchaseSubjectIds;

          // Ensure it's an array and each item has required fields
          if (Array.isArray(separatePurchaseSubjectIds)) {
            separatePurchaseSubjectIds = separatePurchaseSubjectIds.map((sub) => ({
              subjectId: Number(sub.subjectId),
              price: Number(sub.price) || 0,
              discountPrice: Number(sub.discountPrice) || 0,
              expiryDays: Number(sub.expiryDays) || 365,
              position: Number(sub.position) || 1,
              status: sub.status || "active",
              tag: sub.tag || null,
            }));
          } else {
            separatePurchaseSubjectIds = [];
          }
        } catch (e) {
          console.error("Error parsing separatePurchaseSubjectIds:", e);
          separatePurchaseSubjectIds = [];
        }
      }

      /* ================= EMI ================= */
      const emiSchedule = normalizeEmiSchedule(req.body.emiSchedule);

      /* ================= POSITION VALIDATION ================= */
      let position = Number(req.body.position);
      if (position) {
        const existingBatch = await Batch.findOne({
          where: {
            position,
            id: { [Op.ne]: batchId },
          },
        });
        if (existingBatch) {
          await existingBatch.update({
            position: item.position,
          });
        }
      } else {
        position = item.position;
      }

      /* ================= UPDATE PAYLOAD ================= */
      const payload = {
        name: req.body.name,
        slug: req.body.name ? generateSlug(req.body.name) : item.slug,
        displayOrder: req.body.displayOrder,
        position,
        programId: req.body.programId,
        subjectId: JSON.stringify(subjectIds),

        // ✅ New Field - Separate Purchase Subjects
        separatePurchaseSubjectIds: JSON.stringify(separatePurchaseSubjectIds),

        startDate: req.body.startDate,
        endDate: req.body.endDate,
        registrationStartDate: req.body.registrationStartDate,
        registrationEndDate: req.body.registrationEndDate,
        status: req.body.status,
        shortDescription: req.body.shortDescription,
        longDescription: req.body.longDescription,
        medium: req.body.medium || "",
        offerText: req.body.offerText,
        fee_one_time: req.body.fee_one_time,
        fee_inst: req.body.fee_inst,
        note: req.body.note,
        batchPrice: req.body.batchPrice,
        batchDiscountPrice: req.body.batchDiscountPrice,
        gst: req.body.gst,
        offerValidityDays: req.body.offerValidityDays,
        quizIds: Array.isArray(quizIds) ? quizIds : [],
        testSeriesIds: Array.isArray(testSeriesIds) ? testSeriesIds : [],
        isEmi: Boolean(req.body.isEmi),
        emiTotal: req.body.emiTotal || null,
        emiSchedule: emiSchedule || null,
        category: req.body.category,
        imageUrl,
      };

      await item.update(payload);
      await BatchController.clearBatchCache(batchId);

      return res.json({
        message: "Batch updated successfully",
        data: item,
      });
    } catch (err) {
      console.error("Batch Update Error:", err);
      return res.status(500).json({
        message: "Error updating batch",
        error: err.message,
      });
    }
  }
  // =========================
  // DELETE
  // =========================
  static async delete(req, res) {
    try {

      const batchId = req.params.id;

      const item = await Batch.findByPk(batchId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Batch not found"
        });
      }

      /* ================= SAFE S3 DELETE ================= */

      if (item.imageUrl) {
        try {
          await deleteFromS3(item.imageUrl);
        } catch (s3Error) {
          console.error("S3 Delete Error:", s3Error);
          // Continue even if S3 delete fails
        }
      }

      /* ================= DELETE BATCH ================= */

      await item.destroy();

      /* ================= REORDER POSITIONS ================= */

      const batches = await Batch.findAll({
        order: [["position", "ASC"]]
      });

      for (let i = 0; i < batches.length; i++) {
        await batches[i].update({ position: i + 1 });
      }

      /* ================= CLEAR CACHE ================= */

      await BatchController.clearBatchCache(batchId);

      return res.json({
        success: true,
        message: "Batch deleted and positions reordered successfully"
      });

    } catch (err) {

      console.error("Batch Delete Error:", err);

      return res.status(500).json({
        success: false,
        message: "Error deleting batch",
        error: err.message
      });
    }
  }

  // =========================
  // CLEAR REDIS CACHE (FIXED)
  // =========================
  static async clearBatchCache(batchId = null) {
    try {
      const keys = [];

      const batchListKeys = await redis.keys("batches:*");
      const singleBatchKeys = await redis.keys("batch:id:*");

      keys.push(...batchListKeys, ...singleBatchKeys);

      if (batchId) {
        keys.push(`batch:id:${batchId}`);
      }

      if (keys.length) {
        await redis.del(...keys);
      }

      return true;
    } catch (err) {
      console.error("Redis Clear Error:", err);
      return false;
    }
  }
}

module.exports = BatchController;
