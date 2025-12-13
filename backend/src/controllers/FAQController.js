"use strict";

const { FAQ } = require("../models");
const redis = require("../config/redis");

class FAQController {

  // CREATE FAQ
  static async create(req, res) {
    try {
      const payload = {
        question: req.body.question,
        answer: req.body.answer
      };

      const item = await FAQ.create(payload);

      await redis.del("faqs");

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating FAQ", error });
    }
  }


  // GET ALL FAQS
  static async findAll(req, res) {
    try {
      const cache = await redis.get("faqs");
      if (cache) return res.json(JSON.parse(cache));

      const items = await FAQ.findAll({
        order: [["createdAt", "DESC"]]
      });

      await redis.set("faqs", JSON.stringify(items), "EX", 300);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching FAQs", error });
    }
  }


  // GET ONE FAQ
  static async findOne(req, res) {
    try {
      const id = req.params.id;

      const cacheKey = `faq:${id}`;
      const cache = await redis.get(cacheKey);

      if (cache) return res.json(JSON.parse(cache));

      const item = await FAQ.findByPk(id);
      if (!item) return res.status(404).json({ message: "FAQ not found" });

      await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching FAQ", error });
    }
  }


  // UPDATE FAQ
  static async update(req, res) {
    try {
      const item = await FAQ.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "FAQ not found" });

      await item.update({
        question: req.body.question || item.question,
        answer: req.body.answer || item.answer
      });

      await redis.del("faqs");
      await redis.del(`faq:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating FAQ", error });
    }
  }


  // DELETE FAQ
  static async delete(req, res) {
    try {
      const item = await FAQ.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "FAQ not found" });

      await item.destroy();

      await redis.del("faqs");
      await redis.del(`faq:${req.params.id}`);

      return res.json({ message: "FAQ deleted successfully" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting FAQ", error });
    }
  }

}

module.exports = FAQController;
