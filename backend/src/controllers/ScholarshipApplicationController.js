"use strict";
const NotificationController = require("./NotificationController");
const { ScholarshipApplication, Scholarship } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

class ScholarshipApplicationController {
  static async apply(req, res) {
    try {
      const {
        scholarshipId,
        fullName,
        mobile,
        gender,
        category,
        course,
        medium,
      } = req.body;

      const userId = req.user?.id || req.body.userId; // from auth middleware or body

      // Validation
      if (!scholarshipId || !userId || !fullName?.trim() || !mobile?.trim()) {
        return res.status(400).json({
          success: false,
          message: "scholarshipId, userId, fullName, and mobile are required",
        });
      }

      if (!req.files?.certificate || !req.files?.photo) {
        return res.status(400).json({
          success: false,
          message: "Both certificate and photo are required",
        });
      }

      // Check if scholarship exists
      const scholarship = await Scholarship.findByPk(scholarshipId);
      if (!scholarship) {
        return res.status(404).json({
          success: false,
          message: "Scholarship not found",
        });
      }

      // Prevent duplicate application
      const existing = await ScholarshipApplication.findOne({
        where: { userId, scholarshipId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "You have already applied for this scholarship",
        });
      }

      // Upload files to S3
      const certificateFile = req.files.certificate[0];
      const photoFile = req.files.photo[0];

      const certificateUrl = await uploadToS3(certificateFile, "scholarships/certificates");
      const photoUrl = await uploadToS3(photoFile, "scholarships/photos");

      // Create application
      const application = await ScholarshipApplication.create({
        userId,
        scholarshipId,
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        gender,
        category,
        course,
        medium,
        certificatePath: certificateUrl,
        photoPath: photoUrl,
        status: "Pending",
      });


      await NotificationController.createNotification({
        userId,
        title: "Scholarship Application Submitted",
        message: `Your application for the "${scholarship.name}" scholarship has been submitted successfully.`,
        type: "scholarship",
        relatedId: application.id,
      });


      // Invalidate cache
      await redis.del(`scholarshipapps:sch:${scholarshipId}`);
      await redis.del(`scholarshipapps:user:${userId}`);

      return res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        data: application,
      });
    } catch (error) {
      console.error("Scholarship apply error:", error);

      // Optional: cleanup uploaded files on error
      if (req.files?.certificate) {
        await deleteFromS3(req.files.certificate[0].key);
      }
      if (req.files?.photo) {
        await deleteFromS3(req.files.photo[0].key);
      }

      return res.status(500).json({
        success: false,
        message: "Failed to submit application",
      });
    }
  }

  // GET ALL APPLICATIONS FOR A SCHOLARSHIP (ADMIN)
  static async listByScholarship(req, res) {
    try {
      const { scholarshipId } = req.params;

      const cacheKey = `scholarshipapps:sch:${scholarshipId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }

      const applications = await ScholarshipApplication.findAll({
        where: { scholarshipId },
        include: [
          { model: Scholarship, as: "scholarship", attributes: ["name"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      await redis.set(cacheKey, JSON.stringify(applications), "EX", 600);

      return res.json({ success: true, data: applications });
    } catch (error) {
      console.error("listByScholarship error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async allScholarshipApply(req, res) {
    try {
      const applications = await ScholarshipApplication.findAll({
        include: [
          { model: Scholarship, as: "scholarship", attributes: ["name"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      if (applications.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No Application Found",
        });
      }

      // Return applications
      return res.status(200).json({
        success: true,
        message: "Applications fetched successfully",
        data: applications,
      });

    } catch (error) {
      console.error("Error fetching scholarship applications:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message,
      });
    }
  }

  // GET ALL APPLICATIONS OF A USER
  static async listByUser(req, res) {
    try {
      const { userId } = req.params;

      const cacheKey = `scholarshipapps:user:${userId}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }

      const applications = await ScholarshipApplication.findAll({
        where: { userId },
        include: [
          { model: Scholarship, as: "scholarship", attributes: ["name", "discountPercentage"] },
        ],
        order: [["createdAt", "DESC"]],
      });

      await redis.set(cacheKey, JSON.stringify(applications), "EX", 600);

      return res.json({ success: true, data: applications });
    } catch (error) {
      console.error("listByUser error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // UPDATE APPLICATION STATUS (ADMIN)
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["Pending", "Approved", "Rejected"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const application = await ScholarshipApplication.findByPk(id);
      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      await application.update({ status });

      // Invalidate caches
      await redis.del(`scholarshipapps:sch:${application.scholarshipId}`);
      await redis.del(`scholarshipapps:user:${application.userId}`);

      return res.json({
        success: true,
        message: "Status updated",
        data: application,
      });
    } catch (error) {
      console.error("updateStatus error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // DELETE APPLICATION (ADMIN OR USER)
  static async deleteApplication(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const application = await ScholarshipApplication.findByPk(id);
      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" });
      }

      // Optional: restrict to owner or admin
      // if (application.userId !== userId && !req.user.isAdmin) {
      //   return res.status(403).json({ success: false, message: "Unauthorized" });
      // }

      // Delete files from S3
      if (application.certificatePath) {
        await deleteFromS3(application.certificatePath);
      }
      if (application.photoPath) {
        await deleteFromS3(application.photoPath);
      }

      await application.destroy();

      // Invalidate cache
      await redis.del(`scholarshipapps:sch:${application.scholarshipId}`);
      await redis.del(`scholarshipapps:user:${application.userId}`);

      return res.json({ success: true, message: "Application deleted successfully" });
    } catch (error) {
      console.error("deleteApplication error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

module.exports = ScholarshipApplicationController;