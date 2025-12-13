"use strict";

const { Blog } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");
const { generateSlug } = require("../utils/helpers");

class BlogController {

  // CREATE BLOG
  static async create(req, res) {
    try {
      let imageUrl = null;

      if (req.file) {
        imageUrl = await uploadToS3(req.file, "blogs");
      }

      const payload = {
        title: req.body.title,
        slug: generateSlug(req.body.title),
        imageUrl,
        content: req.body.content
      };

      const blog = await Blog.create(payload);

      await redis.del("blogs");

      return res.status(201).json(blog);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating blog", error });
    }
  }



  // GET ALL
  static async findAll(req, res) {
    try {
      const cache = await redis.get("blogs");
      if (cache) return res.json(JSON.parse(cache));

      const blogs = await Blog.findAll({
        order: [["createdAt", "DESC"]]
      });

      await redis.set("blogs", JSON.stringify(blogs), "EX", 120);

      return res.json(blogs);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching blogs", error });
    }
  }



  // GET ONE
  static async findOne(req, res) {
    try {
      const slug = req.params.slug;
      const cacheKey = `blog:${slug}`;

      const cache = await redis.get(cacheKey);
      if (cache) return res.json(JSON.parse(cache));

      const blog = await Blog.findOne({ where: { slug } });

      if (!blog) return res.status(404).json({ message: "Blog not found" });

      await redis.set(cacheKey, JSON.stringify(blog), "EX", 300);

      return res.json(blog);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching blog", error });
    }
  }


  static async findOneById(req, res) {
    try {
      const id = req.params.id;

      const blog = await Blog.findByPk(id);

      if (!blog) return res.status(404).json({ message: "Blog not found" });

      return res.json(blog);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching blog", error });
    }
  }
  // UPDATE
  static async update(req, res) {
    try {
      const id = req.params.id;
      const blog = await Blog.findByPk(id);

      if (!blog) return res.status(404).json({ message: "Blog not found" });

      let imageUrl = blog.imageUrl;

      if (req.file) {
        if (blog.imageUrl) await deleteFromS3(blog.imageUrl);
        imageUrl = await uploadToS3(req.file, "blogs");
      }

      await blog.update({
        title: req.body.title || blog.title,
        slug: req.body.title ? generateSlug(req.body.title) : blog.slug,
        imageUrl,
        content: req.body.content || blog.content
      });

      await redis.del("blogs");
      await redis.del(`blog:${blog.slug}`);

      return res.json(blog);

    } catch (error) {
      return res.status(500).json({ message: "Error updating blog", error });
    }
  }



  // DELETE BLOG
  static async delete(req, res) {
    try {
      const blog = await Blog.findByPk(req.params.id);

      if (!blog) return res.status(404).json({ message: "Blog not found" });

      if (blog.imageUrl) await deleteFromS3(blog.imageUrl);

      await blog.destroy();

      await redis.del("blogs");
      await redis.del(`blog:${blog.slug}`);

      return res.json({ message: "Blog deleted successfully" });

    } catch (error) {
      return res.status(500).json({ message: "Error deleting blog", error });
    }
  }

}

module.exports = BlogController;
