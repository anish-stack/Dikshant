"use strict";

const { AppSetting } = require("../models");
const redis = require("../config/redis");

class AppSettingController {


  // CREATE or UPDATE SETTING
  static async save(req, res) {
    try {
      const { key, value } = req.body;

      if (!key) return res.status(400).json({ message: "Key is required" });

      let setting = await AppSetting.findOne({ where: { key } });

      if (setting) {
        await setting.update({ value });
      } else {
        setting = await AppSetting.create({ key, value });
      }

      await redis.del("appsettings");
      await redis.del(`appsettings:${key}`);

      return res.json(setting);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error saving setting", error });
    }
  }



  // GET ALL SETTINGS
  static async findAll(req, res) {
    try {
      const cache = await redis.get("appsettings");
      if (cache) return res.json(JSON.parse(cache));

      const items = await AppSetting.findAll();

      await redis.set("appsettings", JSON.stringify(items), "EX", 300);

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

      const cache = await redis.get(`appsettings:${key}`);
      if (cache) return res.json(JSON.parse(cache));

      const setting = await AppSetting.findOne({ where: { key } });

      if (!setting) return res.status(404).json({ message: "Setting not found" });

      await redis.set(`appsettings:${key}`, JSON.stringify(setting), "EX", 300);

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
