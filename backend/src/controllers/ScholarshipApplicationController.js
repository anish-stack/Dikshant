"use strict";

const { ScholarshipApplication, Scholarship, User } = require("../models");
const redis = require("../config/redis");

class ScholarshipApplicationController {

  // USER APPLY FOR SCHOLARSHIP
  static async apply(req, res) {
    try {
      const { userId, scholarshipId } = req.body;

      if (!userId || !scholarshipId)
        return res.status(400).json({ message: "userId & scholarshipId required" });

      const scholarship = await Scholarship.findByPk(scholarshipId);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });

      // Prevent duplicate application
      const already = await ScholarshipApplication.findOne({
        where: { userId, scholarshipId }
      });

      if (already)
        return res.status(400).json({ message: "You already applied for this scholarship" });

      const app = await ScholarshipApplication.create({
        userId,
        scholarshipId,
        status: "pending"
      });

      await redis.del(`scholarshipapps:sch:${scholarshipId}`);
      await redis.del(`scholarshipapps:user:${userId}`);

      return res.status(201).json(app);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error applying for scholarship", error });
    }
  }


  // GET ALL APPLICATIONS FOR A SCHOLARSHIP (ADMIN)
  static async listByScholarship(req, res) {
    try {
      const scholarshipId = req.params.scholarshipId;

      const cacheKey = `scholarshipapps:sch:${scholarshipId}`;
      const cache = await redis.get(cacheKey);
      if (cache) return res.json(JSON.parse(cache));

      const apps = await ScholarshipApplication.findAll({
        where: { scholarshipId },
        order: [["createdAt", "DESC"]]
      });

      await redis.set(cacheKey, JSON.stringify(apps), "EX", 300);

      return res.json(apps);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching applications", error });
    }
  }


  // GET ALL APPLICATIONS OF USER
  static async listByUser(req, res) {
    try {
      const userId = req.params.userId;

      const cacheKey = `scholarshipapps:user:${userId}`;
      const cache = await redis.get(cacheKey);
      if (cache) return res.json(JSON.parse(cache));

      const apps = await ScholarshipApplication.findAll({
        where: { userId },
        order: [["createdAt", "DESC"]]
      });

      await redis.set(cacheKey, JSON.stringify(apps), "EX", 300);

      return res.json(apps);

    } catch (error) {
      return res.status(500).json({ message: "Error fetching applications", error });
    }
  }


  // UPDATE STATUS (ADMIN)
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const app = await ScholarshipApplication.findByPk(id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      await app.update({ status });

      await redis.del(`scholarshipapps:sch:${app.scholarshipId}`);
      await redis.del(`scholarshipapps:user:${app.userId}`);

      return res.json(app);

    } catch (error) {
      return res.status(500).json({ message: "Error updating status", error });
    }
  }
  // DELETE APPLICATION
  static async deleteApplication(req, res) {
    try {
      const { id } = req.params;

      const app = await ScholarshipApplication.findByPk(id);
      if (!app) return res.status(404).json({ message: "Application not found" });

      await app.destroy();

      await redis.del(`scholarshipapps:sch:${app.scholarshipId}`);
      await redis.del(`scholarshipapps:user:${app.userId}`);

      return res.json({ message: "Application deleted successfully" });

    } catch (error) {
      return res.status(500).json({ message: "Error deleting application", error });
    }
  }
}

module.exports = ScholarshipApplicationController;
