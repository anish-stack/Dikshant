"use strict";

const { Download } = require("../models");
const redis = require("../config/redis");

class DownloadController {

  // CREATE — When user downloads a file
  static async create(req, res) {
    try {

      const payload = {
        userId: req.body.userId,
        type: req.body.type,
        title: req.body.title,
        fileUrl: req.body.fileUrl,
        itemId: req.body.itemId || null,
        programId: req.body.programId || null,
        batchId: req.body.batchId || null,
        subjectId: req.body.subjectId || null,
        deviceInfo: req.body.deviceInfo || req.headers['user-agent']
      };

      const item = await Download.create(payload);
      await redis.del(`downloads:${payload.userId}`);

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Download entry failed", error });
    }
  }


  // GET ALL downloads of user
  static async findByUser(req, res) {
    try {
      const userId = req.params.userId;

      const cache = await redis.get(`downloads:${userId}`);
      if (cache) return res.json(JSON.parse(cache));

      const items = await Download.findAll({
        where: { userId },
        order: [["downloadedAt", "DESC"]]
      });

      await redis.set(`downloads:${userId}`, JSON.stringify(items), "EX", 300);

      return res.json(items);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching downloads", error });
    }
  }
  static async deletebyUser(req, res) {
    try {
      const userId = req.params.userId;
      const id = req.params.id;

      const deleted = await Download.destroy({
        where: {
          id,
          userId
        }
      });

      if (deleted) {
        await redis.del(`downloads:${userId}`);
        return res.json({ message: "Download entry deleted" });
      } else {
        return res.status(404).json({ message: "Download entry not found" });
      }

    } catch (error) {
      return res.status(500).json({ message: "Error deleting download entry", error });
    }
  }
}

module.exports = DownloadController;
