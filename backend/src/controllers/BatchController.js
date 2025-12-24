"use strict";

const { Batch, Program, Subject, Sequelize } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { generateSlug } = require("../utils/helpers");
const { Op } = Sequelize;

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
        category: req.body.category,
      };

      const item = await Batch.create(payload);

      // await this.clearBatchCache();
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

      // const redisKey = `batches:page:${page}:limit:${limit}:search:${search}`;

      // const cache = await redis.get(redisKey);
      // if (cache) {
      //   return res.json(JSON.parse(cache));
      // }

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

      let subjectIds = [];
      try {
        subjectIds = JSON.parse(item.subjectId || "[]");
      } catch {
        subjectIds = [];
      }

      const subjectsList = await Subject.findAll({
        where: { id: subjectIds },
        attributes: ["id", "name", "slug", "description"],
      });

      const response = {
        ...item.toJSON(),
        subjects: subjectsList,
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

      let imageUrl = item.imageUrl;
      if (req.file) {
        if (item.imageUrl) {
          await deleteFromS3(item.imageUrl);
        }
        imageUrl = await uploadToS3(req.file, "batchs");
      }

      await item.update({
        ...req.body,
        imageUrl,
        slug: req.body.name ? generateSlug(req.body.name) : item.slug,
      });

      // await this.clearBatchCache(batchId);
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
