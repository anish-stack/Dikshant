"use strict";

const { Doubt, User } = require("../models");
const redis = require("../config/redis");

/**
 * ======================================================
 * 🧑‍🎓 STUDENT CONTROLLERS
 * ======================================================
 */

/**
 * ➕ Create Doubt (Student)
 * POST /doubts
 */
exports.createDoubt = async (req, res) => {
  try {
    const userId = req.user.id; // from auth middleware
    const { subject, question, courseId, lessonId, attachmentUrl } = req.body;

    if (!question) {
      return res.status(400).json({
        message: "Subject and question are required",
      });
    }

    const doubt = await Doubt.create({
      userId,
      subject,
      question,
      courseId: courseId || null,
      lessonId: lessonId || null,
      attachmentUrl: attachmentUrl || null,
    });

    // clear cache
    await redis.del(`doubts:user:${userId}`);

    return res.status(201).json({
      message: "Doubt submitted successfully",
      data: doubt,
    });
  } catch (error) {
    console.error("❌ Create Doubt Error:", error);
    return res.status(500).json({
      message: "Failed to create doubt",
      error,
    });
  }
};

/**
 * 📄 Get My Doubts (Student)
 * GET /doubts/my
 */
exports.getMyDoubts = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { course_id, lesson_id, status, category } = req.query;

    // const cacheKey = `doubts:user:${userId}:course:${course_id || "all"}:lesson:${lesson_id || "all"}:status:${status || "all"}:category:${category || "all"}`;

    // const cachedData = await redis.get(cacheKey);
    // if (cachedData) return res.json(JSON.parse(cachedData));

    const where = { userId };

    if (course_id) where.courseId = parseInt(course_id, 10);
    if (lesson_id) where.lessonId = parseInt(lesson_id, 10);
    if (status) where.status = status;
    if (category) where.category = category;

    const doubts = await Doubt.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    // await redis.set(cacheKey, JSON.stringify(doubts || []), "EX", 300);

    return res.json({
      success: true,
      count: doubts.length,
      data: doubts,
    });
  } catch (error) {
    console.error("❌ Fetch My Doubts Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch doubts",
    });
  }
};


/**
 * 👍 Like a Doubt (Student)
 * POST /doubts/:id/like
 */
exports.likeDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.findByPk(req.params.id);

    if (!doubt) {
      return res.status(404).json({ message: "Doubt not found" });
    }

    doubt.likes += 1;
    await doubt.save();

    return res.json({
      message: "Doubt liked",
      likes: doubt.likes,
    });
  } catch (error) {
    console.error("❌ Like Doubt Error:", error);
    return res.status(500).json({
      message: "Failed to like doubt",
      error,
    });
  }
};

/**
 * ======================================================
 * 🧑‍🏫 ADMIN CONTROLLERS
 * ======================================================
 */

/**
 * 📄 Get All Doubts (Admin)
 * GET /admin/doubts
 */
exports.getAllDoubts = async (req, res) => {
  try {
    const { status, courseId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (courseId) where.courseId = courseId;

    const doubts = await Doubt.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    return res.json(doubts);
  } catch (error) {
    console.error("Admin Fetch Doubts Error:", error);
    return res.status(500).json({
      message: "Failed to fetch doubts",
      error,
    });
  }
};

/**
 * ✍️ Answer Doubt (Admin)
 * POST /admin/doubts/:id/answer
 */
exports.answerDoubt = async (req, res) => {
  try {
    const adminName = req?.user?.name || "Admin";
    const { answer } = req.body;

    if (!answer) {
      return res.status(400).json({
        message: "Answer is required",
      });
    }

    const doubt = await Doubt.findByPk(req.params.id);

    if (!doubt) {
      return res.status(404).json({
        message: "Doubt not found",
      });
    }

    doubt.answer = answer;
    doubt.answeredBy = adminName;
    doubt.answeredAt = new Date();
    doubt.status = "answered";

    await doubt.save();

    // clear student cache
    await redis.del(`doubts:user:${doubt.userId}`);

    return res.json({
      message: "Doubt answered successfully",
      data: doubt,
    });
  } catch (error) {
    console.error("❌ Answer Doubt Error:", error);
    return res.status(500).json({
      message: "Failed to answer doubt",
      error,
    });
  }
};

/**
 * 🔒 Close Doubt (Admin)
 * PATCH /admin/doubts/:id/close
 */
exports.closeDoubt = async (req, res) => {
  try {
    const doubt = await Doubt.findByPk(req.params.id);

    if (!doubt) {
      return res.status(404).json({ message: "Doubt not found" });
    }

    doubt.status = "closed";
    await doubt.save();

    return res.json({
      message: "Doubt closed successfully",
    });
  } catch (error) {
    console.error("❌ Close Doubt Error:", error);
    return res.status(500).json({
      message: "Failed to close doubt",
      error,
    });
  }
};
