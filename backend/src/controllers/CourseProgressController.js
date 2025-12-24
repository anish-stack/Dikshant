'use strict';

const { CourseProgress, VideoCourse, PDFNote } = require("../models");
const redis = require("../config/redis");

class CourseProgressController {

  static async updateProgress(req, res) {
    try {
      const { userId, batchId, videoId, percentage, watchedSeconds, duration } = req.body;
      console.log(req.body)
      if (!userId || !batchId || !videoId)
        return res.status(400).json({ message: "Missing required fields" });

      let cp = await CourseProgress.findOne({
        where: { userId, batchId, videoId }
      });

      const isCompleted = percentage >= 100;

      if (cp) {
        await cp.update({
          percentage,
          watchedSeconds: watchedSeconds || cp.watchedSeconds,
          duration: duration || cp.duration,
          isCompleted,
          lastWatchedAt: new Date(),
          viewCount: cp.viewCount + 1
        });
      } else {
        cp = await CourseProgress.create({
          userId,
          batchId,
          videoId,
          percentage,
          watchedSeconds: watchedSeconds || 0,
          duration: duration || null,
          isCompleted,
          lastWatchedAt: new Date(),
          viewCount: 1
        });
      }

      await redis.del(`progress:user:${userId}:batch:${batchId}`);

      return res.json(cp);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error updating progress", error });
    }
  }

static async getBatchProgress(req, res) {
  try {
    const { userId, batchId } = req.params;

    // const cacheKey = `progress:user:${userId}:batch:${batchId}`;
    // const cache = await redis.get(cacheKey);
    // if (cache) return res.json(JSON.parse(cache));

    const progressList = await CourseProgress.findAll({
      where: { userId, batchId },
      include: [
        {
          model: VideoCourse,
          as: "video",
          attributes: ["id", "title", "url"] // ← FIXED: duration removed
        }
      ],
      order: [["id", "ASC"]], // optional but recommended
    });

    // await redis.set(cacheKey, JSON.stringify(progressList), "EX", 300);

    return res.json(progressList);

  } catch (error) {
    console.error("Progress Fetch Error:", error);
    return res.status(500).json({
      message: "Error fetching progress",
      error,
    });
  }
}

  static async getBatchCompletion(req, res) {
    try {
      const { userId, batchId } = req.params;

      const items = await CourseProgress.findAll({ where: { userId, batchId } });

      if (!items.length)
        return res.json({ totalProgress: 0 });

      const total = items.reduce((acc, i) => acc + i.percentage, 0);
      const totalItems = items.length;

      const percentage = Math.round(total / totalItems);

      return res.json({
        totalItems,
        totalProgress: percentage
      });

    } catch (error) {
      return res.status(500).json({ message: "Error calculating progress", error });
    }
  }

}

module.exports = CourseProgressController;
