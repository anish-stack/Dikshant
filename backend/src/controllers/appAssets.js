"use strict";

const { AppAssets } = require("../models");
const redis = require("../config/redis");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

const REDIS_KEY = "app_assets";

/* ==============================
   GET APP ASSETS
============================== */
exports.getAppAssets = async (req, res) => {
  try {
    // 1️⃣ Redis cache
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      return res.json({
        success: true,
        source: "cache",
        data: JSON.parse(cached),
      });
    }

    // 2️⃣ DB
    const assets = await AppAssets.findByPk(1);

    if (!assets) {
      return res.status(404).json({
        success: false,
        message: "App assets not found",
      });
    }

    // 3️⃣ Cache
    await redis.setex(REDIS_KEY, 3600, JSON.stringify(assets));

    res.json({
      success: true,
      source: "db",
      data: assets,
    });
  } catch (error) {
    console.error("❌ getAppAssets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch app assets",
    });
  }
};

/* ==============================
   CREATE / INIT APP ASSETS
   (only once)
============================== */
exports.createAppAssets = async (req, res) => {
  try {
    // Ensure single row
    const existing = await AppAssets.findByPk(1);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "App assets already exist",
      });
    }

    const payload = {};

    // Upload files if present
    if (req.files?.quizVideoIntro) {
      payload.quizVideoIntro = await uploadToS3(
        req.files.quizVideoIntro[0],
        "app-assets/quiz"
      );
    }

    if (req.files?.testSeriesVideoIntro) {
      payload.testSeriesVideoIntro = await uploadToS3(
        req.files.testSeriesVideoIntro[0],
        "app-assets/test-series"
      );
    }

    if (req.files?.onboardingImageOne) {
      payload.onboardingImageOne = await uploadToS3(
        req.files.onboardingImageOne[0],
        "app-assets/onboarding"
      );
    }

    if (req.files?.onboardingImageTwo) {
      payload.onboardingImageTwo = await uploadToS3(
        req.files.onboardingImageTwo[0],
        "app-assets/onboarding"
      );
    }

    const assets = await AppAssets.create({
      id: 1,
      ...payload,
    });

    await redis.del(REDIS_KEY);

    res.status(201).json({
      success: true,
      message: "App assets created",
      data: assets,
    });
  } catch (error) {
    console.error("❌ createAppAssets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create app assets",
    });
  }
};

/* ==============================
   UPDATE APP ASSETS
============================== */
exports.updateAppAssets = async (req, res) => {
  try {
    const assets = await AppAssets.findByPk(1);

    if (!assets) {
      return res.status(404).json({
        success: false,
        message: "App assets not found",
      });
    }

    const updates = {};

    // Helper: replace file
    const replaceFile = async (field, folder) => {
      if (req.files?.[field]) {
        if (assets[field]) {
          await deleteFromS3(assets[field]);
        }
        updates[field] = await uploadToS3(
          req.files[field][0],
          folder
        );
      }
    };

    await replaceFile("quizVideoIntro", "app-assets/quiz");
    await replaceFile("testSeriesVideoIntro", "app-assets/test-series");
    await replaceFile("onboardingImageOne", "app-assets/onboarding");
    await replaceFile("onboardingImageTwo", "app-assets/onboarding");

    await assets.update(updates);

    await redis.del(REDIS_KEY);

    res.json({
      success: true,
      message: "App assets updated",
      data: assets,
    });
  } catch (error) {
    console.error("❌ updateAppAssets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update app assets",
    });
  }
};

/* ==============================
   DELETE APP ASSETS
============================== */
exports.deleteAppAssets = async (req, res) => {
  try {
    const assets = await AppAssets.findByPk(1);

    if (!assets) {
      return res.status(404).json({
        success: false,
        message: "App assets not found",
      });
    }

    // Delete from S3
    const fields = [
      "quizVideoIntro",
      "testSeriesVideoIntro",
      "onboardingImageOne",
      "onboardingImageTwo",
    ];

    for (const field of fields) {
      if (assets[field]) {
        await deleteFromS3(assets[field]);
      }
    }

    await assets.destroy();
    await redis.del(REDIS_KEY);

    res.json({
      success: true,
      message: "App assets deleted",
    });
  } catch (error) {
    console.error("❌ deleteAppAssets:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete app assets",
    });
  }
};
