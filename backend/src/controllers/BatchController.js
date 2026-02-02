"use strict";

const { Batch, Program, Subject, Sequelize ,Quizzes,TestSeries} = require("../models");
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
  try {
    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadToS3(req.file, "batchs");
    }

    // ✅ Normalize quizIds & testSeriesIds
    const quizIds =
      typeof req.body.quizIds === "string"
        ? JSON.parse(req.body.quizIds)
        : req.body.quizIds || [];

    const testSeriesIds =
      typeof req.body.testSeriesIds === "string"
        ? JSON.parse(req.body.testSeriesIds)
        : req.body.testSeriesIds || [];


         const emiSchedule = normalizeEmiSchedule(req.body.emiSchedule);
    const payload = {
      name: req.body.name,
      slug: generateSlug(req.body.name),
      imageUrl,
      displayOrder: req.body.displayOrder,
      programId: req.body.programId,
      subjectId: req.body.subjectId,

      startDate: req.body.startDate,
      endDate: req.body.endDate,
      registrationStartDate: req.body.registrationStartDate,
      registrationEndDate: req.body.registrationEndDate,

      status: req.body.status,
      shortDescription: req.body.shortDescription,
      longDescription: req.body.longDescription,

      batchPrice: req.body.batchPrice,
      batchDiscountPrice: req.body.batchDiscountPrice,
      gst: req.body.gst,
      offerValidityDays: req.body.offerValidityDays,

      // ✅ NEW FIELDS
      quizIds: Array.isArray(quizIds) ? quizIds : [],
      testSeriesIds: Array.isArray(testSeriesIds) ? testSeriesIds : [],

      isEmi: Boolean(req.body.isEmi),
      emiTotal: req.body.emiTotal || null,
      emiSchedule: emiSchedule,

      category: req.body.category,
    };

    const item = await Batch.create(payload);

    await BatchController.clearBatchCache();

    return res.status(201).json(item);
  } catch (err) {
    console.error("Batch Create Error:", err);
    return res.status(500).json({
      message: "Error creating batch",
      error: err.message,
    });
  }
}

  // =========================
  // FIND ALL
  // =========================
  static async findAll(req, res) {
    try {
      let { page = 1, limit = 10, search = "" } = req.query;

      page = parseInt(page);
      limit = parseInt(limit);
      const offset = (page - 1) * limit;

      
      const where = {};

      if (search.trim()) {
        where[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { shortDescription: { [Op.like]: `%${search}%` } },
          { longDescription: { [Op.like]: `%${search}%` } },
        ];
      }

      const result = await Batch.findAndCountAll({
        where,
        limit,
        offset,
        order: [["displayOrder", "ASC"]],
        include: [
          {
            model: Program,
            as: "program",
            attributes: ["id", "name", "slug"],
          },
        ],
      });

      const batchItems = await Promise.all(
        result.rows.map(async (batch) => {
          let subjectIds = [];

          try {
            subjectIds = JSON.parse(batch.subjectId || "[]");
          } catch {
            subjectIds = [];
          }

          const subjectsList = await Subject.findAll({
            where: { id: subjectIds },
            attributes: ["id", "name", "slug", "description"],
          });

          return {
            ...batch.toJSON(),
            subjects: subjectsList,
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

  // =========================
  // FIND ONE
  // =========================
  static async findOne(req, res) {
    try {
      const id = req.params.id;
      // const cacheKey = `batch:id:${id}`;

      // const cached = await redis.get(cacheKey);
      // if (cached) {
      //   return res.json(JSON.parse(cached));
      // }


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
        return res.status(404).json({ message: "Batch not found" });
      }

      const { Op } = require("sequelize");

      let subjectIds = [];

      try {
        let raw = item.subjectId;

        // first parse
        if (typeof raw === "string") {
          raw = JSON.parse(raw);   // "[10,11]"
        }

        // second parse
        if (typeof raw === "string") {
          raw = JSON.parse(raw);   // [10,11]
        }

        if (Array.isArray(raw)) {
          subjectIds = raw.map(Number);
        }
      } catch (err) {
        subjectIds = [];
      }

      console.log("FINAL subjectIds:", subjectIds);

      const subjectsList = subjectIds.length
        ? await Subject.findAll({
          where: {
            id: { [Op.in]: subjectIds }
          },attributes: ["id", "name"],
        })
        : [];

      const subjectNames = subjectsList.map(sub => ({
        id: sub.id,
        name: sub.name,
      }));
      const response = {
        ...item.toJSON(),
        subjects: subjectNames,
      };

      // await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

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
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "Batch ID is required" });

    const { Op } = Sequelize;

    const batch = await Batch.findByPk(id, {
      include: [
        {
          model: Program,
          as: "program",
          attributes: ["id", "name"],
        },
      ],
      raw: false,
    });

    if (!batch) return res.status(404).json({ message: "Batch not found" });

    // ---------------------------
    // Helper: safely parse ID array
    // ---------------------------
    const parseIdArray = (raw) => {
      if (!raw) return [];

      let parsed = raw;

      // string -> parse
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return [];
        }
      }

      // double-stringified
      if (typeof parsed === "string") {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          return [];
        }
      }

      if (!Array.isArray(parsed)) return [];

      return parsed
        .map((x) => Number(x))
        .filter((n) => Number.isInteger(n));
    };

    // ✅ IDs parse (IMPORTANT: your batch has QuizzesIds not quizIds)
    const subjectIds = parseIdArray(batch.subjectId);

    // If your field is quizIds (recommended):
    const quizIds = parseIdArray(batch.quizIds);

    // If your field is QuizzesIds (current in your model), use this instead:
    // const quizIds = parseIdArray(batch.QuizzesIds);

    const testSeriesIds = parseIdArray(batch.testSeriesIds);

    const [subjects, quizzes, testSeries] = await Promise.all([
      subjectIds.length
        ? Subject.findAll({
            where: { id: { [Op.in]: subjectIds } },
            attributes: ["id", "name"],
            raw: true,
          })
        : Promise.resolve([]),

      quizIds.length
        ? Quizzes.findAll({
            where: { id: { [Op.in]: quizIds } },
            attributes: ["id", "title", "image", "price", "description"],
            raw: true,
          })
        : Promise.resolve([]),

      testSeriesIds.length
        ? TestSeries.findAll({
            where: { id: { [Op.in]: testSeriesIds } },
            attributes: ["id", "title", "imageUrl", "price", "description"],
            raw: true,
          })
        : Promise.resolve([]),
    ]);

    const response = {
      ...batch.toJSON(),

      program: batch.program
        ? { id: batch.program.id, name: batch.program.name }
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

      // hide raw id arrays (optional)
      subjectId: undefined,
      quizIds: undefined,        // remove if you used QuizzesIds
      QuizzesIds: undefined,     // remove if you used quizIds
      testSeriesIds: undefined,
    };

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
    if (!item) {
      return res.status(404).json({ message: "Batch not found" });
    }

    /* ================= IMAGE ================= */
    let imageUrl = item.imageUrl;
    if (req.file) {
      if (item.imageUrl) {
        await deleteFromS3(item.imageUrl);
      }
      imageUrl = await uploadToS3(req.file, "batchs");
    }

    /* ================= NORMALIZE JSON FIELDS ================= */
    const quizIds =
      typeof req.body.quizIds === "string"
        ? JSON.parse(req.body.quizIds)
        : req.body.quizIds;

    const testSeriesIds =
      typeof req.body.testSeriesIds === "string"
        ? JSON.parse(req.body.testSeriesIds)
        : req.body.testSeriesIds;

         const emiSchedule = normalizeEmiSchedule(req.body.emiSchedule);
    /* ================= UPDATE PAYLOAD ================= */
    const payload = {
      name: req.body.name,
      displayOrder: req.body.displayOrder,
      programId: req.body.programId,
      subjectId: req.body.subjectId,

      startDate: req.body.startDate,
      endDate: req.body.endDate,
      registrationStartDate: req.body.registrationStartDate,
      registrationEndDate: req.body.registrationEndDate,

      status: req.body.status,
      shortDescription: req.body.shortDescription,
      longDescription: req.body.longDescription,

      batchPrice: req.body.batchPrice,
      batchDiscountPrice: req.body.batchDiscountPrice,
      gst: req.body.gst,
      offerValidityDays: req.body.offerValidityDays,

      // ✅ NEW FIELDS
      quizIds: Array.isArray(quizIds) ? quizIds : [],
      testSeriesIds: Array.isArray(testSeriesIds) ? testSeriesIds : [],

      isEmi: Boolean(req.body.isEmi),
      emiTotal: req.body.emiTotal || null,
      emiSchedule: emiSchedule|| null,

      category: req.body.category,
      imageUrl,

      slug: req.body.name
        ? generateSlug(req.body.name)
        : item.slug,
    };

    await item.update(payload);

    await BatchController.clearBatchCache(batchId);

    return res.json(item);
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
        return res.status(404).json({ message: "Batch not found" });
      }

      if (item.imageUrl) {
        await deleteFromS3(item.imageUrl);
      }

      await item.destroy();

      // await this.clearBatchCache(batchId);
      await BatchController.clearBatchCache(batchId);

      return res.json({ message: "Batch deleted successfully" });
    } catch (err) {
      console.error("Batch Delete Error:", err);
      return res.status(500).json({
        message: "Error deleting batch",
        error: err.message,
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
