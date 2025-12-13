'use strict';

const { Subject } = require('../models');
const redis = require('../config/redis');
const { generateSlug } = require('../utils/helpers');

class SubjectController {

  // ======================
  // CREATE SUBJECT
  // ======================
  static async create(req, res) {
    try {

      const payload = {
        name: req.body.name,
        slug: generateSlug(req.body.name),
        description: req.body.description,
      };

      const item = await Subject.create(payload);

     
      await redis.del("subjects");

      return res.status(201).json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error creating subject', error });
    }
  }



  // ======================
  // ALL SUBJECTS
  // ======================
  static async findAll(req, res) {
    try {
      const cacheData = await redis.get("subjects");

    
      if (cacheData) {
        return res.json(JSON.parse(cacheData));
      }

      const items = await Subject.findAll();

      // Store in Redis for 60 sec
      await redis.set("subjects", JSON.stringify(items), "EX", 60);

      return res.json(items);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching subjects', error });
    }
  }



  // ======================
  // ONE SUBJECT
  // ======================
  static async findOne(req, res) {
    try {
      const id = req.params.id;
      const cacheKey = `subject:${id}`;

      const cacheData = await redis.get(cacheKey);

    
      if (cacheData) {
        return res.json(JSON.parse(cacheData));
      }

      const item = await Subject.findByPk(id);

      if (!item) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      // Cache for 5 minutes
      await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

      return res.json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching subject', error });
    }
  }



  // ======================
  // UPDATE SUBJECT
  // ======================
  static async update(req, res) {
    try {
      const item = await Subject.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: 'Subject not found' });

      const payload = {
        name: req.body.name,
        description: req.body.description,
        slug: req.body.name ? generateSlug(req.body.name) : item.slug,
      };

      await item.update(payload);

      await redis.del("subjects");
      await redis.del(`subject:${req.params.id}`);

      return res.json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error updating subject', error });
    }
  }



  // ======================
  // DELETE SUBJECT
  // ======================
  static async delete(req, res) {
    try {
      const item = await Subject.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: 'Subject not found' });

      await item.destroy();

      
      await redis.del("subjects");
      await redis.del(`subject:${req.params.id}`);

      return res.json({ message: 'Subject deleted' });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error deleting subject', error });
    }
  }
}

module.exports = SubjectController;
