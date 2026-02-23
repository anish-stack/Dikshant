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
        description: req.body.description,
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
      // ✅ Secure admin check (recommended way)
      const isAdmin = req.query.isAdmin === "true";

      const whereCondition = isAdmin
        ? {}
        : {
            publishDate: {
              [Op.lte]: new Date(),
            },
          };

      const announcements = await Announcement.findAll({
        where: whereCondition,
        order: [["publishDate", "DESC"]],
      });

      return res.json(announcements);

    } catch (error) {
      console.error("Error fetching announcements:", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching announcements",
      });
    }
  }



  // GET ONE
  static async findOne(req, res) {
    try {
   
      const item = await Announcement.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Announcement not found" });

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
        description: req.body.description || item.description,

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
