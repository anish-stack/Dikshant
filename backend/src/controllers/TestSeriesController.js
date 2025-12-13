'use strict';

const { TestSeries } = require('../models');
const redis = require('../config/redis');
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require('../utils/s3Delete');
const { generateSlug } = require('../utils/helpers');

class TestSeriesController {

  // CREATE
  static async create(req, res) {
    try {
      let imageUrl = null;

      if (req.file) {
        imageUrl = await uploadToS3(req.file, "testseries");
      }

      const payload = {
        imageUrl,
        title: req.body.title,
        slug: generateSlug(req.body.title),
        displayOrder: req.body.displayOrder,
        status: req.body.status,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        description: req.body.description,
        price: req.body.price,
        discountPrice: req.body.discountPrice,
        gst: req.body.gst,
  
      };

      const item = await TestSeries.create(payload);

      await redis.del("testseries");

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating test series", error });
    }
  }


  // GET ALL
  static async findAll(req, res) {
    try {
   
      const cache = await redis.get("testseries");
      if (cache) return res.json(JSON.parse(cache));

      const items = await TestSeries.findAll();

      await redis.set("testseries", JSON.stringify(items), "EX", 60);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching test series", error });
    }
  }


  // GET ONE
  static async findOne(req, res) {
    try {
      const cache = await redis.get(`testseries:${req.params.id}`);
      if (cache) return res.json(JSON.parse(cache));

      const item = await TestSeries.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Not found" });

      await redis.set(`testseries:${req.params.id}`, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching test series", error });
    }
  }


  // UPDATE
  static async update(req, res) {
    try {
      const item = await TestSeries.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Not found" });

      let imageUrl = item.imageUrl;

      if (req.file) {
        if (item.imageUrl) await deleteFromS3(item.imageUrl);
        imageUrl = await uploadToS3(req.file, "testseries");
      }

      await item.update({
        imageUrl,
        title: req.body.title || item.title,
        slug: req.body.title ? generateSlug(req.body.title) : item.slug,
        displayOrder: req.body.displayOrder || item.displayOrder,
        status: req.body.status || item.status,
        isActive: req.body.isActive !== undefined ? req.body.isActive : item.isActive,
        description: req.body.description || item.description,
        price: req.body.price || item.price,
        discountPrice: req.body.discountPrice || item.discountPrice,
        gst: req.body.gst || item.gst,
      });

      await redis.del("testseries");
      await redis.del(`testseries:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating test series", error });
    }
  }


  // DELETE
  static async delete(req, res) {
    try {
      const item = await TestSeries.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Not found" });

      if (item.imageUrl) await deleteFromS3(item.imageUrl);

      await item.destroy();

      await redis.del("testseries");
      await redis.del(`testseries:${req.params.id}`);

      return res.json({ message: "Deleted" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting test series", error });
    }
  }
}

module.exports = TestSeriesController;
