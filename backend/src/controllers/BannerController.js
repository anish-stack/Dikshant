"use strict";

const { Banner } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

class BannerController {

  static async create(req, res) {
    try {
      let imageUrl = null;

      if (req.file) {
        imageUrl = await uploadToS3(req.file, "banners");
      }

      const booleanFields = ["status"];
      for (const field of booleanFields) {
        if (req.body[field] !== undefined) {
          const val = req.body[field];
          if (val === true || val === false) continue;
          if (val === "true" || val === "1" || val === 1) req.body[field] = true;
          else if (val === "false" || val === "0" || val === 0) req.body[field] = false;
          else {
            return res.status(400).json({
              success: false,
              message: `${field} must be a boolean`
            });
          }
        }
      }

      const payload = {
        title: req.body.title,
        imageUrl,
        linkUrl: req.body.linkUrl,
        position: req.body.position ? Number(req.body.position) : 0,
        status: req.body.status !== undefined ? req.body.status : true
      };

      const item = await Banner.create(payload);

      await redis.del("banners");

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating banner" });
    }
  }



  static async findAll(req, res) {
    try {
      // const cache = await redis.get("banners");
      // if (cache) return res.json(JSON.parse(cache));

      const items = await Banner.findAll({
        order: [["position", "ASC"], ["createdAt", "DESC"]]
      });

      // await redis.set("banners", JSON.stringify(items), "EX", 300);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching banners" });
    }
  }



  static async findOne(req, res) {
    try {
      const id = req.params.id;

      // const cache = await redis.get(`banner:${id}`);
      // if (cache) return res.json(JSON.parse(cache));

      const item = await Banner.findByPk(id);
      if (!item) return res.status(404).json({ message: "Banner not found" });

      // await redis.set(`banner:${id}`, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching banner" });
    }
  }



  static async update(req, res) {
    try {
      const item = await Banner.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Banner not found" });

      let imageUrl = item.imageUrl;

      if (req.file) {
        if (item.imageUrl) await deleteFromS3(item.imageUrl);
        imageUrl = await uploadToS3(req.file, "banners");
      }

      const booleanFields = ["status"];
      for (const field of booleanFields) {
        if (req.body[field] !== undefined) {
          const val = req.body[field];
          if (val === true || val === false) continue;
          if (val === "true" || val === "1" || val === 1) req.body[field] = true;
          else if (val === "false" || val === "0" || val === 0) req.body[field] = false;
          else {
            return res.status(400).json({
              success: false,
              message: `${field} must be a boolean`
            });
          }
        }
      }

      await item.update({
        title: req.body.title || item.title,
        imageUrl,
        linkUrl: req.body.linkUrl || item.linkUrl,
        position: req.body.position !== undefined ? Number(req.body.position) : item.position,
        status: req.body.status !== undefined ? req.body.status : item.status
      });

      await redis.del("banners");
      await redis.del(`banner:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating banner" });
    }
  }



  static async delete(req, res) {
    try {
      const item = await Banner.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Banner not found" });

      if (item.imageUrl) await deleteFromS3(item.imageUrl);

      await item.destroy();

      await redis.del("banners");
      await redis.del(`banner:${req.params.id}`);

      return res.json({ message: "Banner deleted" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting banner" });
    }
  }
}

module.exports = BannerController;
