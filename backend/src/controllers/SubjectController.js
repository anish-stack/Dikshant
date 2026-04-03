'use strict';

const { Subject } = require('../models');
const redis = require('../config/redis');
const { generateSlug } = require('../utils/helpers');
const { Op } = require('sequelize');

class SubjectController {

  // ======================
  // CREATE SUBJECT
  // ======================
  static async create(req, res) {
    try {

      /* ================= POSITION HANDLING ================= */

      let position = Number(req.body.position);

      if (!position || position < 1) {

        const maxPosition = await Subject.max("position");
        position = (maxPosition || 0) + 1;

      } else {

        // shift existing subjects down
        await Subject.increment(
          { position: 1 },
          {
            where: {
              position: { [Op.gte]: position }
            }
          }
        );

      }

      /* ================= CREATE ================= */

      const payload = {
        name: req.body.name,
        slug: generateSlug(req.body.name),
        description: req.body.description,
        position
      };

      const item = await Subject.create(payload);

      /* ================= CACHE CLEAR ================= */

      await redis.del("subjects");

      return res.status(201).json({
        success: true,
        message: "Subject created successfully",
        data: item
      });

    } catch (error) {

      console.error("Subject Create Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error creating subject",
        error: error.message
      });
    }
  }


  // ======================
  // ALL SUBJECTS
  // ======================
  static async findAll(req, res) {
    try {

      const items = await Subject.findAll({
        order: [["position", "ASC"]] // ⭐ order by position
      });

      return res.json(items);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Error fetching subjects",
        error
      });
    }
  }


  static async findOne(req, res) {
    try {
      const id = req.params.id;


      const item = await Subject.findByPk(id);

      if (!item) {
        return res.status(404).json({ message: 'Subject not found' });
      }

      // Cache for 5 minutes
      // await redis.set(cacheKey, JSON.stringify(item), "EX", 300);

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

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      /* ================= POSITION SWAP ================= */

      let position =
        req.body.position !== undefined
          ? Number(req.body.position)
          : item.position;

      if (req.body.position !== undefined && position !== item.position) {

        if (!position || position < 1) {
          const maxPosition = await Subject.max("position");
          position = (maxPosition || 0) + 1;
        }

        const existingSubject = await Subject.findOne({
          where: {
            position,
            id: { [Op.ne]: item.id }
          }
        });

        if (existingSubject) {

          // swap positions
          await existingSubject.update({
            position: item.position
          });

        }
      }

      /* ================= UPDATE PAYLOAD ================= */

      const payload = {
        name: req.body.name ?? item.name,
        description: req.body.description ?? item.description,
        slug: req.body.name ? generateSlug(req.body.name) : item.slug,
        position
      };

      await item.update(payload);

      /* ================= CACHE CLEAR ================= */

      await redis.del("subjects");
      await redis.del(`subject:${req.params.id}`);

      return res.json({
        success: true,
        message: "Subject updated successfully",
        data: item
      });

    } catch (error) {

      console.error("Subject Update Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error updating subject",
        error: error.message
      });
    }
  }

  // ======================
  // DELETE SUBJECT
  // ======================
  static async delete(req, res) {
    try {

      const item = await Subject.findByPk(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Subject not found"
        });
      }

      // DELETE SUBJECT
      await item.destroy();

      /* ================= REORDER POSITIONS ================= */

      const subjects = await Subject.findAll({
        order: [["position", "ASC"]]
      });

      for (let i = 0; i < subjects.length; i++) {
        await subjects[i].update({ position: i + 1 });
      }

      /* ================= CACHE CLEAR ================= */

      await redis.del("subjects");
      await redis.del(`subject:${req.params.id}`);

      return res.json({
        success: true,
        message: "Subject deleted and positions reordered"
      });

    } catch (error) {

      console.error("Subject Delete Error:", error);

      return res.status(500).json({
        success: false,
        message: "Error deleting subject",
        error: error.message
      });
    }
  }
}

module.exports = SubjectController;
