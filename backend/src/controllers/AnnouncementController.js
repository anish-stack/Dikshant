"use strict";

const { Announcement } = require("../models");
const redis = require("../config/redis");

class AnnouncementController {

  // CREATE
  static async create(req, res) {
    try {
      const payload = {
        title: req.body.title,
        message: req.body.message,
        publishDate: req.body.publishDate
      };

      const item = await Announcement.create(payload);

      await redis.del("announcements");

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating announcement", error });
    }
  }



  // GET ALL
  static async findAll(req, res) {
    try {
      const cache = await redis.get("announcements");

      if (cache) return res.json(JSON.parse(cache));

      const items = await Announcement.findAll({
        order: [["publishDate", "DESC"]]
      });

      await redis.set("announcements", JSON.stringify(items), "EX", 60);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching announcements", error });
    }
  }



  // GET ONE
  static async findOne(req, res) {
    try {
      const cacheKey = `announcement:${req.params.id}`;
      const cache = await redis.get(cacheKey);

      if (cache) return res.json(JSON.parse(cache));

      const item = await Announcement.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Announcement not found" });

      await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching announcement", error });
    }
  }



  // UPDATE
  static async update(req, res) {
    try {
      const item = await Announcement.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Announcement not found" });

      await item.update({
        title: req.body.title || item.title,
        message: req.body.message || item.message,
        publishDate: req.body.publishDate || item.publishDate
      });

      await redis.del("announcements");
      await redis.del(`announcement:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating announcement", error });
    }
  }



  // DELETE
  static async delete(req, res) {
    try {
      const item = await Announcement.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Announcement not found" });

      await item.destroy();

      await redis.del("announcements");
      await redis.del(`announcement:${req.params.id}`);

      return res.json({ message: "Announcement deleted" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting announcement", error });
    }
  }

}

module.exports = AnnouncementController;
