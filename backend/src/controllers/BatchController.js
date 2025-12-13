"use strict";

const { Batch, Program, Subject, Sequelize } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { generateSlug } = require("../utils/helpers");
const { Op } = Sequelize;

class BatchController {
  // CREATE
  static async create(req, res) {
    try {
      let imageUrl = null;

      if (req.file) {
        imageUrl = await uploadToS3(req.file, "batchs");
      }

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
        isEmi: req.body.isEmi || false,
        emiTotal: req.body.emiTotal || null,
        emiSchedule: req.body.emiSchedule || null,
      };

      const item = await Batch.create(payload);

      // Clear all batch-related cache
      await this.clearBatchCache();

      return res.status(201).json(item);
    } catch (err) {
      console.error("Batch Create Error:", err);
      return res
        .status(500)
        .json({ message: "Error creating batch", error: err.message });
    }
  }

  // FIND ALL
static async findAll(req, res) {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const redisKey = `batches:page:${page}:limit:${limit}:search:${search}`;

    // Check Redis Cache
    const cache = await redis.get(redisKey);
    if (cache) {
      return res.json(JSON.parse(cache));
    }

    const where = {};

    // --------------------------
    // 🔍 SEARCH FIX (Correct OR)
    // --------------------------
    if (search.trim()) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { shortDescription: { [Op.like]: `%${search}%` } },
        { longDescription: { [Op.like]: `%${search}%` } },
      ];
    }

    // --------------------------
    // 📦 FETCH BATCHES

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

    // --------------------------
    // 📚 LOAD SUBJECTS
    // --------------------------
    const batchItems = await Promise.all(
      result.rows.map(async (batch) => {
        let subjectIds = [];

        try {
          subjectIds = JSON.parse(batch.subjectId || "[]");
        } catch (e) {
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

    // Final response
    const response = {
      total: result.count,
      page,
      limit,
      pages: Math.ceil(result.count / limit),
      items: batchItems,
    };

    // Store in Redis (1 minute)
    await redis.set(redisKey, JSON.stringify(response), "EX", 60);

    return res.json(response);

  } catch (err) {
    console.error("Batch Fetch Error:", err);
    return res.status(500).json({
      message: "Error fetching batches",
      error: err.message,
    });
  }
}

  // FIND ONE

  static async findOne(req, res) {
    try {
      const id = req.params.id;
      const cacheKey = `batch:id:${id}`;

      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Fetch batch with program
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

      // Parse subjectId = "[1,2,3]"
      let subjectIds = [];
      try {
        subjectIds = JSON.parse(item.subjectId || "[]");
      } catch (e) {
        subjectIds = [];
      }

      // Fetch actual subjects
      const subjectsList = await Subject.findAll({
        where: { id: subjectIds },
        attributes: ["id", "name", "slug", "description"],
      });

      // Handle emiSchedule
      let emiScheduleData = [];
      if (item.emiSchedule) {
        if (typeof item.emiSchedule === "string") {
          try {
            emiScheduleData = JSON.parse(item.emiSchedule);
          } catch (e) {
            emiScheduleData = [];
          }
        } else {
          emiScheduleData = item.emiSchedule; // already JSON
        }
      }

      const response = {
        ...item.toJSON(),
        subjects: subjectsList,
        emiSchedule: emiScheduleData, // safe normalized array
      };

      // Cache result for 5 minutes
      await redis.set(cacheKey, JSON.stringify(response), "EX", 300);

      return res.json(response);
    } catch (err) {
      console.error("Batch Fetch Error (findOne):", err);
      return res
        .status(500)
        .json({ message: "Error fetching batch", error: err.message });
    }
  }

  // UPDATE BATCH
  static async update(req, res) {
    try {
      console.log("Update Request Body:", req.body);

      const batchId = req.params.id;

      // 1️⃣ Find existing batch
      const item = await Batch.findByPk(batchId);
      if (!item) {
        return res.status(404).json({ message: "Batch not found" });
      }

      // 2️⃣ Handle image upload/delete
      let imageUrl = item.imageUrl;
      if (req.file) {
        // Delete old image from S3 if exists
        if (item.imageUrl) {
          try {
            await deleteFromS3(item.imageUrl);
          } catch (deleteErr) {
            console.error("Error deleting old image:", deleteErr);
          }
        }
        // Upload new image
        imageUrl = await uploadToS3(req.file, "batchs");
      }

      // 3️⃣ Parse JSON fields
      let subjectIdParsed = item.subjectId;
      if (req.body.subjectId) {
        try {
          // Ensure it's stored as a string like "[1,2,3]"
          subjectIdParsed =
            typeof req.body.subjectId === "string"
              ? req.body.subjectId
              : JSON.stringify(req.body.subjectId);
        } catch (e) {
          subjectIdParsed = item.subjectId;
        }
      }

      let emiScheduleParsed = [];
      if (req.body.emiSchedule) {
        try {
          emiScheduleParsed =
            typeof req.body.emiSchedule === "string"
              ? JSON.parse(req.body.emiSchedule)
              : req.body.emiSchedule;
        } catch (e) {
          console.error("Invalid emiSchedule JSON, storing as empty array");
          emiScheduleParsed = [];
        }
      }

      // 4️⃣ Prepare payload
      const payload = {
        name: req.body.name || item.name,
        slug: req.body.name ? generateSlug(req.body.name) : item.slug,
        imageUrl,
        displayOrder: req.body.displayOrder ?? item.displayOrder,
        programId: req.body.programId ?? item.programId,
        subjectId: subjectIdParsed,
        startDate: req.body.startDate ?? item.startDate,
        endDate: req.body.endDate ?? item.endDate,
        registrationStartDate:
          req.body.registrationStartDate ?? item.registrationStartDate,
        registrationEndDate:
          req.body.registrationEndDate ?? item.registrationEndDate,
        status: req.body.status ?? item.status,
        shortDescription: req.body.shortDescription ?? item.shortDescription,
        longDescription: req.body.longDescription ?? item.longDescription,
        batchPrice: req.body.batchPrice ?? item.batchPrice,
        batchDiscountPrice:
          req.body.batchDiscountPrice ?? item.batchDiscountPrice,
        gst: req.body.gst ?? item.gst,
        offerValidityDays: req.body.offerValidityDays ?? item.offerValidityDays,
        isEmi: req.body.isEmi === "true" || req.body.isEmi === true,
        emiTotal: req.body.emiTotal ?? item.emiTotal,
        emiSchedule: Array.isArray(emiScheduleParsed)
          ? emiScheduleParsed
          : JSON.parse(emiScheduleParsed || "[]"),
      };

      // 5️⃣ Update batch
      await item.update(payload);

      // 6️⃣ Clear Redis cache
      await redis.del("batchs"); // list cache
      await redis.del(`batch:${batchId}`); // single batch cache

      // 7️⃣ Fetch program + subjects for response
      const programData = await Program.findByPk(item.programId, {
        attributes: ["id", "name", "slug"],
      });

      let subjectIds = [];
      try {
        subjectIds = JSON.parse(item.subjectId || "[]");
      } catch (e) {
        subjectIds = [];
      }

      const subjectsList = await Subject.findAll({
        where: { id: subjectIds },
        attributes: ["id", "name", "slug", "description"],
      });

      // 8️⃣ Prepare response
      const response = {
        ...item.toJSON(),
        program: programData,
        subjects: subjectsList,
      };

      return res.json(response);
    } catch (err) {
      console.error("Batch Update Error:", err);
      return res
        .status(500)
        .json({ message: "Error updating batch", error: err.message });
    }
  }

  // DELETE
  static async delete(req, res) {
    try {
      const batchId = req.params.id;

      const item = await Batch.findByPk(batchId);
      if (!item) {
        return res.status(404).json({ message: "Batch not found" });
      }

      // Delete image from S3 if exists
      if (item.imageUrl) {
        try {
          await deleteFromS3(item.imageUrl);
        } catch (deleteErr) {
          console.error("Error deleting image:", deleteErr);
        }
      }

      await item.destroy();

      // Clear all batch-related cache
      await this.clearBatchCache(batchId);

      return res.json({ message: "Batch deleted successfully" });
    } catch (err) {
      console.error("Batch Delete Error:", err);
      return res
        .status(500)
        .json({ message: "Error deleting batch", error: err.message });
    }
  }

  // HELPER: Clear all batch-related cache
  static async clearBatchCache(batchId = null) {
    try {
      const keysToDelete = [];

      // Get all keys matching batch patterns
      const batchKeys = await redis.keys("batches:*");
      const singleBatchKeys = await redis.keys("batch:*");

      keysToDelete.push(...batchKeys, ...singleBatchKeys);

      // If specific batch ID provided, ensure its cache is deleted
      if (batchId) {
        keysToDelete.push(`batch:id:${batchId}`);
      }

      // Delete all keys
      if (keysToDelete.length > 0) {
        await redis.del(...keysToDelete);
        console.log(`Cleared ${keysToDelete.length} cache keys`);
      }

      return true;
    } catch (err) {
      console.error("Error clearing batch cache:", err);
      return false;
    }
  }
}

module.exports = BatchController;
