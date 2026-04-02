'use strict';

const { Program } = require('../models');
const redis = require('../config/redis');
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require("../utils/s3Delete");
const { generateSlug } = require('../utils/helpers');
const { Op } = require('sequelize');

class ProgramController {

  // =========================
  // CREATE PROGRAM
  // =========================
  static async create(req, res) {
    try {

      let imageUrl = null;

      if (req.file) {
        imageUrl = await uploadToS3(req.file, "programs");
      }

      /* ================= POSITION HANDLING ================= */

      let position = Number(req.body.position);

      if (!position || position < 1) {
        const maxPosition = await Program.max("position");
        position = (maxPosition || 0) + 1;
      }

      const existingProgram = await Program.findOne({
        where: { position },
        attributes: ["id", "name", "position"]
      });

      if (existingProgram) {

        const maxPosition = await Program.max("position");

        return res.status(400).json({
          success: false,
          message: `Position ${position} is already used by program "${existingProgram.name}" - Available position: ${(maxPosition || 0) + 1}.`,
          suggestedPosition: (maxPosition || 0) + 1
        });
      }

      /* ================= CREATE ================= */

      const program = await Program.create({
        name: req.body.name,
        slug: generateSlug(req.body.name),
        description: req.body.description,
        position,
        imageUrl
      });

      await redis.del("programs");

      return res.status(201).json({
        success: true,
        message: "Program created successfully",
        data: program
      });

    } catch (error) {

      console.error("Program Create Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error creating program",
        error: error.message
      });
    }
  }



  // =========================
  // GET ALL PROGRAMS
  // =========================
  static async findAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        type = ""        // Offline, Online, Recorded, Live
      } = req.query;

      const offset = (page - 1) * limit;

      // Build dynamic WHERE filters
      const where = {};

      // Search by program name
      if (search) {
        where.name = { [Op.like]: `%${search}%` };
      }

      // Filter by Type
      // if (type) {
      //   where.typeOfCourse = type;
      // }

      // ---- Redis Cache Key (unique per query) ----
      // const cacheKey = `programs:${page}:${limit}:${search}:${type}`;

      // Check cache
      // const cached = await redis.get(cacheKey);
      // if (cached) {
      //   return res.json(JSON.parse(cached));
      // }

      // Fetch from DB
      const { rows, count } = await Program.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [["position", "ASC"]], // Order by position
      });

      const response = {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit),
        data: rows,
      };

      // Save into Redis for 60 sec
      // await redis.set(cacheKey, JSON.stringify(response), "EX", 60);

      return res.json(response);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error fetching programs",
        error
      });
    }

  }

  static async findOne(req, res) {
    try {
      const programId = req.params.id;

      // ✔ Check Redis first
      // const cacheKey = `program:${programId}`;
      // const cacheData = await redis.get(cacheKey);

      // if (cacheData) {
      //   return res.json(JSON.parse(cacheData));
      // }

      const program = await Program.findByPk(programId);

      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }

      // ✔ Save in Redis
      // await redis.set(cacheKey, JSON.stringify(program), "EX", 300);

      return res.json(program);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error fetching program",
        error
      });
    }
  }



  // =========================
  // UPDATE PROGRAM
  // =========================
  static async update(req, res) {
    try {

      const program = await Program.findByPk(req.params.id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Program not found"
        });
      }

      /* ================= IMAGE ================= */

      let imageUrl = program.imageUrl;

      if (req.file) {
        if (program.imageUrl) {
          await deleteFromS3(program.imageUrl);
        }

        imageUrl = await uploadToS3(req.file, "programs");
      }

      /* ================= POSITION HANDLING ================= */

      let position =
        req.body.position !== undefined
          ? Number(req.body.position)
          : program.position;

      if (req.body.position !== undefined) {

        if (!position || position < 1) {
          const maxPosition = await Program.max("position");
          position = (maxPosition || 0) + 1;
        }

        const existingProgram = await Program.findOne({
          where: {
            position,
            id: { [Op.ne]: program.id } // exclude current
          },
          attributes: ["id", "name", "position"]
        });

        if (existingProgram) {

          const maxPosition = await Program.max("position");

          return res.status(400).json({
            success: false,
            message: `Position ${position} is already used by program "${existingProgram.name}" - Available position: ${(maxPosition || 0) + 1}.`,
            suggestedPosition: (maxPosition || 0) + 1
          });
        }
      }

      /* ================= UPDATE ================= */

      await program.update({
        name: req.body.name ?? program.name,
        slug: req.body.name ? generateSlug(req.body.name) : program.slug,
        description: req.body.description ?? program.description,
        position,
        imageUrl
      });

      /* ================= CACHE CLEAR ================= */

      await redis.del("programs");
      await redis.del(`program:${req.params.id}`);

      return res.json({
        success: true,
        message: "Program updated successfully",
        data: program
      });

    } catch (error) {

      console.error("Program Update Error:", error);

      return res.status(500).json({
        success: false,
        message: error,
        error: error.message
      });
    }
  }


  // =========================
  // DELETE PROGRAM
  // =========================
static async delete(req, res) {
  try {

    const program = await Program.findByPk(req.params.id);

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found"
      });
    }

    // DELETE IMAGE FROM S3
    if (program.imageUrl) {
     try {
       await deleteFromS3(program.imageUrl);
     } catch (error) {
      // skip error but log it
       console.error("S3 Deletion Error:", error);
      // continue with deletion even if image deletion fails
     }
    }

    // DELETE PROGRAM
    await program.destroy();

    /* ================= REORDER POSITIONS ================= */

    const programs = await Program.findAll({
      order: [["position", "ASC"]]
    });

    for (let i = 0; i < programs.length; i++) {
      await programs[i].update({ position: i + 1 });
    }

    /* ================= CACHE CLEAR ================= */

    await redis.del("programs");
    await redis.del(`program:${req.params.id}`);

    return res.json({
      success: true,
      message: "Program deleted and positions reordered successfully"
    });

  } catch (error) {

    console.error("Program Delete Error:", error);

    return res.status(500).json({
      success: false,
      message: "Error deleting program",
      error: error.message
    });
  }
}
}

module.exports = ProgramController;
