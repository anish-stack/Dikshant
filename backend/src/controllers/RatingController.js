"use strict";

const { AppRating } = require("../models");
const redis = require("../config/redis");

const CACHE_KEY_ALL = "app_ratings:all";
const CACHE_TTL = 300; // 5 minutes

module.exports = {
  /**
   * ⭐ Create Rating
   * POST /api/app-ratings
   */
  async create(req, res) {
    try {
        const userId = req.user.id
      const {
        rating,
        feedback,
        platform,
        storeRated = false,
        storeLinkUsed = null,
      } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          message: "Rating must be between 1 and 5",
        });
      }

      if (!platform || !["android", "ios", "web"].includes(platform)) {
        return res.status(400).json({
          message: "Invalid platform",
        });
      }

      const item = await AppRating.create({
        userId,
        rating,
        feedback,
        platform,
        storeRated,
        storeLinkUsed,
      });

      // Clear cache
      await redis.del(CACHE_KEY_ALL);

      return res.status(201).json({
        message: "Rating submitted successfully",
        data: item,
      });
    } catch (error) {
      console.error("❌ Create Rating Error:", error);
      return res.status(500).json({
        message: "Failed to submit rating",
        error,
      });
    }
  },

  /**
   * 📥 Get All Ratings (Admin)
   * GET /api/app-ratings
   */
  async findAll(req, res) {
    try {
      // const cache = await redis.get(CACHE_KEY_ALL);
      // if (cache) {
      //   return res.json(JSON.parse(cache));
      // }

      const items = await AppRating.findAll({
        order: [["created_at", "DESC"]],
      });

      // await redis.set(
      //   CACHE_KEY_ALL,
      //   JSON.stringify(items),
      //   "EX",
      //   CACHE_TTL
      // );

      return res.json(items);
    } catch (error) {
      console.error("❌ Fetch Ratings Error:", error);
      return res.status(500).json({
        message: "Error fetching ratings",
        error,
      });
    }
  },

  /**
   * 🔍 Get Rating By ID
   * GET /api/app-ratings/:id
   */
  async findOne(req, res) {
    try {
      const { id } = req.params;
      const cacheKey = `app_ratings:${id}`;

      const cache = await redis.get(cacheKey);
      if (cache) {
        return res.json(JSON.parse(cache));
      }

      const item = await AppRating.findByPk(id);

      if (!item) {
        return res.status(404).json({
          message: "Rating not found",
        });
      }

      await redis.set(cacheKey, JSON.stringify(item), "EX", CACHE_TTL);

      return res.json(item);
    } catch (error) {
      console.error("❌ Fetch Rating Error:", error);
      return res.status(500).json({
        message: "Error fetching rating",
        error,
      });
    }
  },

  /**
   * ✏️ Update Rating (Optional)
   * PUT /api/app-ratings/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params;

      const item = await AppRating.findByPk(id);
      if (!item) {
        return res.status(404).json({
          message: "Rating not found",
        });
      }

      await item.update(req.body);

      // Clear cache
      await redis.del(CACHE_KEY_ALL);
      await redis.del(`app_ratings:${id}`);

      return res.json({
        message: "Rating updated successfully",
        data: item,
      });
    } catch (error) {
      console.error("❌ Update Rating Error:", error);
      return res.status(500).json({
        message: "Error updating rating",
        error,
      });
    }
  },

  /**
   * 🗑 Delete Rating
   * DELETE /api/app-ratings/:id
   */
  async remove(req, res) {
    try {
      const { id } = req.params;

      const item = await AppRating.findByPk(id);
      if (!item) {
        return res.status(404).json({
          message: "Rating not found",
        });
      }

      await item.destroy();

      // Clear cache
      await redis.del(CACHE_KEY_ALL);
      await redis.del(`app_ratings:${id}`);

      return res.json({
        message: "Rating deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete Rating Error:", error);
      return res.status(500).json({
        message: "Error deleting rating",
        error,
      });
    }
  },

  /**
   * 📊 Rating Summary (Dashboard)
   * GET /api/app-ratings/summary
   */
  async summary(req, res) {
    try {
      const ratings = await AppRating.findAll({
        attributes: ["rating"],
      });

      const summary = {
        total: ratings.length,
        average: 0,
        stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };

      ratings.forEach((r) => {
        summary.stars[r.rating]++;
        summary.average += r.rating;
      });

      summary.average =
        summary.total > 0
          ? (summary.average / summary.total).toFixed(1)
          : 0;

      return res.json(summary);
    } catch (error) {
      console.error("❌ Rating Summary Error:", error);
      return res.status(500).json({
        message: "Error fetching rating summary",
        error,
      });
    }
  },
};
