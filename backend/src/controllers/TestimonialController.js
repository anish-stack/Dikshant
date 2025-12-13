"use strict";

const { Testimonial } = require("../models");
const redis = require("../config/redis");

class TestimonialController {

  // CREATE
  static async create(req, res) {
    try {
      const payload = {
        name: req.body.name,
        message: req.body.message,
        role: req.body.role
      };

      const item = await Testimonial.create(payload);

      await redis.del("testimonials");

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating testimonial", error });
    }
  }


  // GET ALL
  static async findAll(req, res) {
    try {
      const cache = await redis.get("testimonials");
      if (cache) return res.json(JSON.parse(cache));

      const items = await Testimonial.findAll({
        order: [["createdAt", "DESC"]]
      });

      await redis.set("testimonials", JSON.stringify(items), "EX", 300);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching testimonials", error });
    }
  }



  // GET ONE
  static async findOne(req, res) {
    try {
      const id = req.params.id;
      const cacheKey = `testimonial:${id}`;

      const cache = await redis.get(cacheKey);
      if (cache) return res.json(JSON.parse(cache));

      const item = await Testimonial.findByPk(id);

      if (!item) return res.status(404).json({ message: "Not found" });

      await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching testimonial", error });
    }
  }



  // UPDATE
  static async update(req, res) {
    try {
      const item = await Testimonial.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Not found" });

      await item.update({
        name: req.body.name || item.name,
        message: req.body.message || item.message,
        role: req.body.role || item.role
      });

      await redis.del("testimonials");
      await redis.del(`testimonial:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating testimonial", error });
    }
  }



  // DELETE
  static async delete(req, res) {
    try {
      const item = await Testimonial.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Not found" });

      await item.destroy();

      await redis.del("testimonials");
      await redis.del(`testimonial:${req.params.id}`);

      return res.json({ message: "Testimonial deleted successfully" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting testimonial", error });
    }
  }
}

module.exports = TestimonialController;
