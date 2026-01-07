"use strict";

const { AppSetting } = require("../models");
const redis = require("../config/redis");

class AppSettingController {

static async save(req, res) {
  try {
    const { key, value } = req.body;

    console.log("Received:", { key, value });

    if (!key) {
      return res.status(400).json({ message: "Key is required" });
    }

    // Fetch the single settings row
    const setting = await AppSetting.findOne();

    if (!setting) {
      return res.status(404).json({ message: "App settings row not found" });
    }

    // Map frontend key → model attribute (camelCase)
    // These must EXACTLY match your model's defined attributes
    const attributeMap = {
      appName: "appName",
      appVersion: "appVersion",
      maintenanceMode: "maintenanceMode",
      maintenanceMessage: "maintenanceMessage",
      enableQuiz: "enableQuiz",
      enableTestSeries: "enableTestSeries",
      enableScholarship: "enableScholarship",
      enableOffers: "enableOffers",
      pushNotificationsEnabled: "pushNotificationsEnabled",
      playStoreUrl: "playStoreUrl",
      webSiteUrl: "webSiteUrl",
      appStoreUrl: "appStoreUrl",
      privacyPolicyUrl: "privacyPolicyUrl",
      termsUrl: "termsUrl",
      supportEmail: "supportEmail",
      supportPhone: "supportPhone",
      supportWhatsapp: "supportWhatsapp",
      paymentsEnabled: "paymentsEnabled",
      androidMinVersion: "androidMinVersion",
      androidLatestVersion: "androidLatestVersion",
      androidForceUpdate: "androidForceUpdate",
      androidUpdateMessage: "androidUpdateMessage",
      iosMinVersion: "iosMinVersion",
      iosLatestVersion: "iosLatestVersion",
      iosForceUpdate: "iosForceUpdate",
      iosUpdateMessage: "iosUpdateMessage",
      forceUpdatePlatform: "forceUpdatePlatform",
      forceUpdate: "forceUpdate",
      updateMessage: "updateMessage",
      extra: "extra",
    };

    const attribute = attributeMap[key];

    if (!attribute) {
      return res.status(400).json({ message: `Invalid key: ${key}` });
    }

    // Use the model attribute name (camelCase)
    const updateData = { [attribute]: value };

    console.log("Updating with:", updateData); // ← Debug this!

    const [affectedCount] = await AppSetting.update(updateData, {
      where: { id: setting.id }, // or just { id: 6 } if fixed
    });

    // OR use instance.update() and force it
    // await setting.update(updateData);

    if (affectedCount === 0) {
      console.log("No rows updated — possible value didn't change or field mismatch");
    }

    // Clear cache
    const redis = req.app.get('redis');
    if (redis) {
      await redis.del("appsettings");
      await redis.del(`appsettings:${key}`);
    }

    return res.json({
      success: true,
      message: "Setting updated successfully",
      key,
      value,
      updatedAttribute: attribute,
      affectedRows: affectedCount
    });

  } catch (error) {
    console.error("Error in save setting:", error);
    return res.status(500).json({
      message: "Error saving setting",
      error: error.message
    });
  }
}
  // GET ALL SETTINGS
  static async findAll(req, res) {
    try {
      // const cache = await redis.get("appsettings");
      // if (cache) return res.json(JSON.parse(cache));

      const items = await AppSetting.findAll();

      // await redis.set("appsettings", JSON.stringify(items), "EX", 300);

      return res.json(items);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching settings", error });
    }
  }



  // GET SETTING BY KEY
  static async findOne(req, res) {
    try {
      const { key } = req.params;

      // const cache = await redis.get(`appsettings:${key}`);
      // if (cache) return res.json(JSON.parse(cache));

      const setting = await AppSetting.findOne({ where: { key } });

      if (!setting) return res.status(404).json({ message: "Setting not found" });

      // await redis.set(`appsettings:${key}`, JSON.stringify(setting), "EX", 300);

      return res.json(setting);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error fetching setting", error });
    }
  }



  // DELETE SETTING
  static async delete(req, res) {
    try {
      const id = req.params.id;

      const setting = await AppSetting.findByPk(id);

      if (!setting) return res.status(404).json({ message: "Setting not found" });

      await redis.del("appsettings");
      await redis.del(`appsettings:${setting.key}`);

      await setting.destroy();

      return res.json({ message: "Setting deleted successfully" });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error deleting setting", error });
    }
  }

}

module.exports = AppSettingController;
