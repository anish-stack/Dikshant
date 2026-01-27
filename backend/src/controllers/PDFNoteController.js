'use strict';

const { PDFNote ,PdfCategory } = require('../models');
const redis = require('../config/redis');
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require('../utils/s3Delete');

class PDFNoteController {

  /* ================= CREATE ================= */
  static async create(req, res) {
    try {
      let fileUrl = null;

      if (req.file) {
        fileUrl = await uploadToS3(req.file, "pdfnotes");
      }

      const payload = {
        title: req.body.title,
        fileUrl,
        programId: req.body.programId || null,
        batchId: req.body.batchId || null,
        subjectId: req.body.subjectId || null,
        videoId: req.body.videoId || null,          // ✅ ADDED
        pdfCategory: req.body.pdfCategory,           // ✅ ADDED (REQUIRED)
        status: req.body.status || "active",
      };

      if (!payload.pdfCategory) {
        return res.status(400).json({
          message: "pdfCategory is required",
        });
      }

      const item = await PDFNote.create(payload);

      await redis.del("pdfnotes");

      return res.status(201).json({
        success: true,
        data: item,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error creating PDF note",
        error,
      });
    }
  }

/* ================= GET ALL (WITH FILTERS) ================= */
static async findAll(req, res) {
  try {
    const {
      videoId,
      batchId,
      programId,
      subjectId,
      pdfCategory,
      status,
    } = req.query;

    const where = {};

    if (videoId) where.videoId = videoId;
    if (batchId) where.batchId = batchId;
    if (programId) where.programId = programId;
    if (subjectId) where.subjectId = subjectId;
    if (pdfCategory) where.pdfCategory = pdfCategory;
    if (status) where.status = status;

    const items = await PDFNote.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: PdfCategory, // 👈 important
          as: "category",
          attributes: ["id", "name", "status"],   // only needed fields
        },
      ],
    });

    return res.json({
      success: true,
      count: items.length,
      data: items,
    });

  } catch (error) {
    console.error("Get PDF Notes Error:", error);
    return res.status(500).json({
      message: "Error fetching PDF notes",
      error,
    });
  }
}


  /* ================= GET ONE ================= */
  static async findOne(req, res) {
    try {
      const item = await PDFNote.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({
          message: "PDF note not found",
        });
      }

      return res.json({
        success: true,
        data: item,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error fetching PDF note",
        error,
      });
    }
  }

  /* ================= UPDATE ================= */
  static async update(req, res) {
    try {
      const item = await PDFNote.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({
          message: "PDF note not found",
        });
      }

      let fileUrl = item.fileUrl;

      if (req.file) {
        if (item.fileUrl) await deleteFromS3(item.fileUrl);
        fileUrl = await uploadToS3(req.file, "pdfnotes");
      }

      await item.update({
        title: req.body.title ?? item.title,
        fileUrl,
        programId: req.body.programId ?? item.programId,
        batchId: req.body.batchId ?? item.batchId,
        subjectId: req.body.subjectId ?? item.subjectId,
        videoId: req.body.videoId ?? item.videoId,      // ✅ ADDED
        pdfCategory: req.body.pdfCategory ?? item.pdfCategory, // ✅ ADDED
        status: req.body.status ?? item.status,
      });

      await redis.del("pdfnotes");
      await redis.del(`pdfnote:${req.params.id}`);

      return res.json({
        success: true,
        data: item,
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error updating PDF note",
        error,
      });
    }
  }

  /* ================= DELETE ================= */
  static async delete(req, res) {
    try {
      const item = await PDFNote.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({
          message: "PDF note not found",
        });
      }

      if (item.fileUrl) await deleteFromS3(item.fileUrl);

      await item.destroy();

      await redis.del("pdfnotes");
      await redis.del(`pdfnote:${req.params.id}`);

      return res.json({
        success: true,
        message: "PDF note deleted",
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error deleting PDF note",
        error,
      });
    }
  }
}

module.exports = PDFNoteController;
