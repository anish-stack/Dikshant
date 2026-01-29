"use strict";

const { AppAssets } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

const REDIS_KEY = "app_assets:single";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed mime types for images & videos
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

/* ==============================
   HELPER: Validate file
============================== */
const validateFile = (file, allowedTypes, fieldName) => {
  if (!file) return null;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${fieldName} file is too large (max 10MB)`);
  }
  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error(`Invalid file type for ${fieldName}. Allowed: ${allowedTypes.join(", ")}`);
  }
  return file;
};

/* ==============================
   GET APP ASSETS (cached)
============================== */
exports.getAppAssets = async (req, res) => {
  try {
    // Try cache first
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    const assets = await AppAssets.findByPk(1);

    if (!assets) {
      return res.status(404).json({
        success: false,
        message: "App assets configuration not found",
      });
    }

    // Cache for 1 hour
    await redis.setex(REDIS_KEY, 3600, JSON.stringify(assets));

    return res.json({
      success: true,
      source: "database",
      data: assets,
    });
  } catch (error) {
    console.error("❌ getAppAssets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch app assets",
      error: error.message,
    });
  }
};

/* ==============================
   CREATE APP ASSETS (only once)
============================== */
exports.createAppAssets = async (req, res) => {
  try {
    // Prevent multiple creations
    const existing = await AppAssets.findByPk(1);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "App assets already exist. Use PUT/PATCH to update.",
      });
    }

    const payload = {
      id: 1,
      isMaintenanceMode: false,
      alert_enabled: false,
      alert_type: "info",
      alert_display_type: "popup",
      alert_is_blocking: false,
    };

    // ─── File uploads ───────────────────────────────────────
    const files = req.files || {};

    if (files.quizVideoIntro) {
      validateFile(files.quizVideoIntro[0], ALLOWED_VIDEO_TYPES, "Quiz Intro Video");
      payload.quizVideoIntro = await uploadToS3(files.quizVideoIntro[0], "app-assets/quiz");
    }

    if (files.testSeriesVideoIntro) {
      validateFile(files.testSeriesVideoIntro[0], ALLOWED_VIDEO_TYPES, "Test Series Intro Video");
      payload.testSeriesVideoIntro = await uploadToS3(files.testSeriesVideoIntro[0], "app-assets/test-series");
    }

    if (files.onboardingImageOne) {
      validateFile(files.onboardingImageOne[0], ALLOWED_IMAGE_TYPES, "Onboarding Image 1");
      payload.onboardingImageOne = await uploadToS3(files.onboardingImageOne[0], "app-assets/onboarding");
    }

    if (files.onboardingImageTwo) {
      validateFile(files.onboardingImageTwo[0], ALLOWED_IMAGE_TYPES, "Onboarding Image 2");
      payload.onboardingImageTwo = await uploadToS3(files.onboardingImageTwo[0], "app-assets/onboarding");
    }

    if (files.appLogo) {
      validateFile(files.appLogo[0], ALLOWED_IMAGE_TYPES, "App Logo");
      payload.appLogo = await uploadToS3(files.appLogo[0], "app-assets/logo");
    }

    // ─── Text / boolean fields ──────────────────────────────
    const textFields = [
      "appName", "supportPhone", "supportEmail", "supportWhatsappLink", "supportAddress",
      "facebookLink", "instagramLink", "youtubeLink", "telegramLink", "twitterLink", "linkedinLink",
      "maintenanceTitle", "maintenanceMessage", "alert_title", "alert_message"
    ];

    textFields.forEach(field => {
      if (req.body[field]) payload[field] = req.body[field].trim();
    });

    // Booleans
    if (req.body.isMaintenanceMode !== undefined) {
      payload.isMaintenanceMode = req.body.isMaintenanceMode === "true" || req.body.isMaintenanceMode === true;
    }
    if (req.body.alert_enabled !== undefined) {
      payload.alert_enabled = req.body.alert_enabled === "true" || req.body.alert_enabled === true;
    }
    if (req.body.alert_is_blocking !== undefined) {
      payload.alert_is_blocking = req.body.alert_is_blocking === "true" || req.body.alert_is_blocking === true;
    }

    // Enums
    if (req.body.alert_type && ["info", "warning", "success", "error"].includes(req.body.alert_type)) {
      payload.alert_type = req.body.alert_type;
    }
    if (req.body.alert_display_type && ["popup", "banner", "toast"].includes(req.body.alert_display_type)) {
      payload.alert_display_type = req.body.alert_display_type;
    }

    // Dates
    if (req.body.maintenanceStartAt) payload.maintenanceStartAt = new Date(req.body.maintenanceStartAt);
    if (req.body.maintenanceEndAt) payload.maintenanceEndAt = new Date(req.body.maintenanceEndAt);
    if (req.body.alert_start_at) payload.alert_start_at = new Date(req.body.alert_start_at);
    if (req.body.alert_end_at) payload.alert_end_at = new Date(req.body.alert_end_at);

    const assets = await AppAssets.create(payload);

    // Clear cache
    await redis.del(REDIS_KEY);

    return res.status(201).json({
      success: true,
      message: "App assets initialized successfully",
      data: assets,
    });
  } catch (error) {
    console.error("❌ createAppAssets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create app assets",
      error: error.message,
    });
  }
};

/* ==============================
   UPDATE / PATCH APP ASSETS
============================== */
exports.updateAppAssets = async (req, res) => {
  try {
    const assets = await AppAssets.findByPk(1);
    if (!assets) {
      return res.status(404).json({
        success: false,
        message: "App assets not found. Create first.",
      });
    }

    const updates = {};

    // ─── File replacement logic ─────────────────────────────
    const replaceFile = async (field, folder, allowedTypes) => {
      if (req.files?.[field]?.[0]) {
        const file = req.files[field][0];
        validateFile(file, allowedTypes, field);
        // Delete old if exists
        if (assets[field]) {
          await deleteFromS3(assets[field]).catch(console.warn);
        }
        updates[field] = await uploadToS3(file, folder);
      }
    };

    await replaceFile("quizVideoIntro", "app-assets/quiz", ALLOWED_VIDEO_TYPES);
    await replaceFile("testSeriesVideoIntro", "app-assets/test-series", ALLOWED_VIDEO_TYPES);
    await replaceFile("onboardingImageOne", "app-assets/onboarding", ALLOWED_IMAGE_TYPES);
    await replaceFile("onboardingImageTwo", "app-assets/onboarding", ALLOWED_IMAGE_TYPES);
    await replaceFile("appLogo", "app-assets/logo", ALLOWED_IMAGE_TYPES);

    // ─── Text / string fields ───────────────────────────────
    const textFields = [
      "appName", "supportPhone", "supportEmail", "supportWhatsappLink", "supportAddress",
      "facebookLink", "instagramLink", "youtubeLink", "telegramLink", "twitterLink", "linkedinLink",
      "maintenanceTitle", "maintenanceMessage", "alert_title", "alert_message"
    ];

    textFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field].trim() || null;
      }
    });

    // ─── Booleans ───────────────────────────────────────────
    if (req.body.isMaintenanceMode !== undefined) {
      updates.isMaintenanceMode = req.body.isMaintenanceMode === "true" || req.body.isMaintenanceMode === true;
    }
    if (req.body.alert_enabled !== undefined) {
      updates.alert_enabled = req.body.alert_enabled === "true" || req.body.alert_enabled === true;
    }
    if (req.body.alert_is_blocking !== undefined) {
      updates.alert_is_blocking = req.body.alert_is_blocking === "true" || req.body.alert_is_blocking === true;
    }

    // ─── Enums ──────────────────────────────────────────────
    if (req.body.alert_type && ["info", "warning", "success", "error"].includes(req.body.alert_type)) {
      updates.alert_type = req.body.alert_type;
    }
    if (req.body.alert_display_type && ["popup", "banner", "toast"].includes(req.body.alert_display_type)) {
      updates.alert_display_type = req.body.alert_display_type;
    }

    // ─── Dates ──────────────────────────────────────────────
    if (req.body.maintenanceStartAt) updates.maintenanceStartAt = new Date(req.body.maintenanceStartAt);
    if (req.body.maintenanceEndAt) updates.maintenanceEndAt = new Date(req.body.maintenanceEndAt);
    if (req.body.alert_start_at) updates.alert_start_at = new Date(req.body.alert_start_at);
    if (req.body.alert_end_at) updates.alert_end_at = new Date(req.body.alert_end_at);

    // Perform update only if there are changes
    if (Object.keys(updates).length === 0) {
      return res.json({
        success: true,
        message: "No changes provided",
        data: assets,
      });
    }

    await assets.update(updates);

    // Invalidate cache
    await redis.del(REDIS_KEY);

    return res.json({
      success: true,
      message: "App assets updated successfully",
      data: assets,
    });
  } catch (error) {
    console.error("❌ updateAppAssets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update app assets",
      error: error.message,
    });
  }
};

/* ==============================
   DELETE APP ASSETS (full reset)
============================== */
exports.deleteAppAssets = async (req, res) => {
  try {
    const assets = await AppAssets.findByPk(1);
    if (!assets) {
      return res.status(404).json({
        success: false,
        message: "Nothing to delete",
      });
    }

    const fileFields = [
      "quizVideoIntro",
      "testSeriesVideoIntro",
      "onboardingImageOne",
      "onboardingImageTwo",
      "appLogo",
    ];

    // Clean up S3 files
    await Promise.allSettled(
      fileFields.map(async (field) => {
        if (assets[field]) await deleteFromS3(assets[field]);
      })
    );

    await assets.destroy();
    await redis.del(REDIS_KEY);

    return res.json({
      success: true,
      message: "App assets configuration has been completely removed",
    });
  } catch (error) {
    console.error("❌ deleteAppAssets:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete app assets",
      error: error.message,
    });
  }
};