"use strict";

const { Page } = require("../models");
const redis = require("../config/redis");
const { generateSlug } = require("../utils/helpers");

class PageController {

  // CREATE PAGE
  static async create(req, res) {
    try {
      const payload = {
        title: req.body.title,
        slug: generateSlug(req.body.title),
        content: req.body.content
      };

      const page = await Page.create(payload);

      await redis.del("pages");

      return res.status(201).json(page);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating page", error });
    }
  }



  // GET ALL PAGES
  static async findAll(req, res) {
    try {
      const cache = await redis.get("pages");
      if (cache) return res.json(JSON.parse(cache));

      const pages = await Page.findAll({
        order: [["createdAt", "DESC"]]
      });

      await redis.set("pages", JSON.stringify(pages), "EX", 300);

      return res.json(pages);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching pages", error });
    }
  }



  // GET PAGE BY SLUG (BEST PRACTICE)
  static async findOne(req, res) {
    try {
      const { slug } = req.params;

      const cacheKey = `page:${slug}`;
      const cache = await redis.get(cacheKey);

      if (cache) return res.json(JSON.parse(cache));

      const page = await Page.findOne({ where: { slug } });

      if (!page) return res.status(404).json({ message: "Page not found" });

      await redis.set(cacheKey, JSON.stringify(page), "EX", 300);

      return res.json(page);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching page", error });
    }
  }



  // UPDATE PAGE
  static async update(req, res) {
    try {
      const page = await Page.findByPk(req.params.id);
      if (!page) return res.status(404).json({ message: "Page not found" });

      await page.update({
        title: req.body.title || page.title,
        slug: req.body.title ? generateSlug(req.body.title) : page.slug,
        content: req.body.content || page.content
      });

      await redis.del("pages");
      await redis.del(`page:${page.slug}`);

      return res.json(page);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating page", error });
    }
  }



  // DELETE PAGE
  static async delete(req, res) {
    try {
      const page = await Page.findByPk(req.params.id);
      if (!page) return res.status(404).json({ message: "Page not found" });

      await redis.del("pages");
      await redis.del(`page:${page.slug}`);

      await page.destroy();

      return res.json({ message: "Page deleted successfully" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting page", error });
    }
  }

}

module.exports = PageController;
