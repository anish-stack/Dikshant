'use strict';

const { PDFNote } = require('../models');
const redis = require('../config/redis');
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require('../utils/s3Delete');

class PDFNoteController {

  // CREATE
  static async create(req, res) {
    try {
      let fileUrl = null;

      if (req.file) {
        fileUrl = await uploadToS3(req.file, "pdfnotes");
      }

      const payload = {
        title: req.body.title,
        fileUrl,
        programId: req.body.programId,
        batchId: req.body.batchId,
        subjectId: req.body.subjectId,
        status: req.body.status || "active"
      };

      const item = await PDFNote.create(payload);

      await redis.del("pdfnotes");

      return res.status(201).json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error creating PDF note", error });
    }
  }



  // GET ALL
  static async findAll(req, res) {
    try {
      const cache = await redis.get("pdfnotes");
      if (cache) return res.json(JSON.parse(cache));

      const items = await PDFNote.findAll();

      await redis.set("pdfnotes", JSON.stringify(items), "EX", 60);

      return res.json(items);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching PDF notes", error });
    }
  }



  // GET ONE
  static async findOne(req, res) {
    try {
      const cache = await redis.get(`pdfnote:${req.params.id}`);
      if (cache) return res.json(JSON.parse(cache));

      const item = await PDFNote.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "PDF note not found" });

      await redis.set(`pdfnote:${req.params.id}`, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching PDF note", error });
    }
  }



  // UPDATE
  static async update(req, res) {
    try {
      const item = await PDFNote.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "PDF note not found" });

      let fileUrl = item.fileUrl;

      if (req.file) {
        if (item.fileUrl) await deleteFromS3(item.fileUrl);
        fileUrl = await uploadToS3(req.file, "pdfnotes");
      }

      await item.update({
        title: req.body.title || item.title,
        fileUrl,
        programId: req.body.programId || item.programId,
        batchId: req.body.batchId || item.batchId,
        subjectId: req.body.subjectId || item.subjectId,
        status: req.body.status || item.status
      });

      await redis.del("pdfnotes");
      await redis.del(`pdfnote:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error updating PDF note", error });
    }
  }



  // DELETE
  static async delete(req, res) {
    try {
      const item = await PDFNote.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "PDF note not found" });

      if (item.fileUrl) await deleteFromS3(item.fileUrl);

      await item.destroy();

      await redis.del("pdfnotes");
      await redis.del(`pdfnote:${req.params.id}`);

      return res.json({ message: "PDF note deleted" });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error deleting PDF note", error });
    }
  }
}

module.exports = PDFNoteController;
