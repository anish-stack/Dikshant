"use strict";

const { Scholarship } = require("../models");
const redis = require("../config/redis");

class ScholarshipController {

  // CREATE SCHOLARSHIP
  static async create(req, res) {
    try {
      const payload = {
        name: req.body.name,
        description: req.body.description,
        noOfQuestions: req.body.noOfQuestions,
        duration: req.body.duration
      };

      const item = await Scholarship.create(payload);

      await redis.del("scholarships");

      return res.status(201).json(item);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating scholarship", error });
    }
  }


  // GET ALL
  static async findAll(req, res) {
    try {
      // const cache = await redis.get("scholarships");
      // if (cache) return res.json(JSON.parse(cache));

      const items = await Scholarship.findAll({
        order: [["createdAt", "DESC"]]
      });

      // await redis.set("scholarships", JSON.stringify(items), "EX", 300);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching scholarships", error });
    }
  }


  // GET ONE
  static async findOne(req, res) {
    try {
      const id = req.params.id;

      // const cacheKey = `scholarship:${id}`;
      // const cache = await redis.get(cacheKey);
      // if (cache) return res.json(JSON.parse(cache));

      const item = await Scholarship.findByPk(id);

      if (!item) return res.status(404).json({ message: "Scholarship not found" });

      // await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching scholarship", error });
    }
  }


  // UPDATE
  static async update(req, res) {
    try {
      const item = await Scholarship.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Scholarship not found" });

      await item.update({
        name: req.body.name || item.name,
        description: req.body.description || item.description,
        noOfQuestions: req.body.noOfQuestions || item.noOfQuestions,
        duration: req.body.duration || item.duration
      });

      await redis.del("scholarships");
      await redis.del(`scholarship:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      return res.status(500).json({ message: "Error updating scholarship", error });
    }
  }


  // DELETE
  static async delete(req, res) {
    try {
      const item = await Scholarship.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Scholarship not found" });

      await item.destroy();

      await redis.del("scholarships");
      await redis.del(`scholarship:${req.params.id}`);

      return res.json({ message: "Scholarship deleted successfully" });

    } catch (error) {
      return res.status(500).json({ message: "Error deleting scholarship", error });
    }
  }
  static async getQuestions(req, res) {
    try {
      const { id } = req.params;

      const scholarship = await Scholarship.findByPk(id);
      if (!scholarship)
        return res.status(404).json({ message: "Scholarship not found" });

      const limit = scholarship.noOfQuestions;

      // RANDOM QUESTIONS
      const questions = await ScholarshipMCQQuestion.findAll({
        order: sequelize.random(),
        limit
      });

      return res.json({
        scholarshipId: id,
        totalQuestions: limit,
        questions
      });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching questions", error });
    }
  }

  static async startTest(req, res) {
    const { id } = req.params;

    const scholarship = await Scholarship.findByPk(id);
    if (!scholarship)
      return res.status(404).json({ message: "Scholarship not found" });

    const now = Date.now();
    const endTime = now + scholarship.duration * 60 * 1000;

    return res.json({
      timeLimit: scholarship.duration,
      serverTime: now,
      endTime
    });
  }
}

module.exports = ScholarshipController;
