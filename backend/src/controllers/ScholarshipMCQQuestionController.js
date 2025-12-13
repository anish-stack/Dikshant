'use strict';
const { ScholarshipMCQQuestion } = require('../models');
const redis = require('../config/redis');

class ScholarshipMCQQuestionController {
  static async create(req, res) {
    try {

      const payload = {
        questionType: req.body.questionType,
        positiveMarks: req.body.positiveMarks,
        negativeMark: req.body.negativeMark,
        question: req.body.question,
        // options: JSON.parse(req.body.options),      // ["A","B","C","D"]
        // correctOption: JSON.parse(req.body.correctOption) // ["A"] or ["A","C"]
        options: req.body.options,
        correctOption: req.body.correctOption
      };

      const item = await ScholarshipMCQQuestion.create(payload);

      await redis.del("scholarship_mcq_list");

      return res.status(201).json(item);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error creating MCQ", err });
    }
  }

  // ALL MCQs
  static async findAll(req, res) {
    try {
      const cached = await redis.get("scholarship_mcq_list");

      if (cached) return res.json(JSON.parse(cached));

      const items = await ScholarshipMCQQuestion.findAll();

      await redis.set("scholarship_mcq_list", JSON.stringify(items), "EX", 60);

      return res.json(items);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching MCQs", err });
    }
  }


  // ONE MCQ
  static async findOne(req, res) {
    try {
      const id = req.params.id;
      const cacheKey = `smcq:${id}`;

      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));

      const item = await ScholarshipMCQQuestion.findByPk(id);

      if (!item) return res.status(404).json({ message: "MCQ not found" });

      await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error fetching MCQ", err });
    }
  }


  // UPDATE
  static async update(req, res) {
    try {
      const item = await ScholarshipMCQQuestion.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "MCQ not found" });

      const payload = {
        questionType: req.body.questionType || item.questionType,
        positiveMarks: req.body.positiveMarks || item.positiveMarks,
        negativeMark: req.body.negativeMark || item.negativeMark,
        question: req.body.question || item.question,
        // options: req.body.options ? JSON.parse(req.body.options) : item.options,
        // correctOption: req.body.correctOption ? JSON.parse(req.body.correctOption) : item.correctOption
        options: req.body.options ?? item.options,
        correctOption: req.body.correctOption ?? item.correctOption

      };

      await item.update(payload);

      await redis.del("scholarship_mcq_list");
      await redis.del(`smcq:${req.params.id}`);

      return res.json(item);

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error updating MCQ", err });
    }
  }


  // DELETE
  static async delete(req, res) {
    try {
      const item = await ScholarshipMCQQuestion.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "MCQ not found" });

      await item.destroy();

      await redis.del("scholarship_mcq_list");
      await redis.del(`smcq:${req.params.id}`);

      return res.json({ message: "MCQ deleted" });

    } catch (err) {
      console.log(err);
      return res.status(500).json({ message: "Error deleting MCQ", err });
    }
  }
 
}

module.exports = ScholarshipMCQQuestionController;
