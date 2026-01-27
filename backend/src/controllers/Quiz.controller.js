const {
  getQuizCache,
  clearAllQuizCache,
  setQuizCache,
  deleteQuizCache,
} = require("../cache/Quiz.Cache");

const { Quizzes, Sequelize, Order ,sequelize } = require("../models");
const { Op } = Sequelize;

const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

class QuizController {
  /* =========================
     CREATE QUIZ
  ========================== */
  static async createQuiz(req, res) {
    try {
      const file = req.file;

      console.log("Req Body:", req.body);

      /* =========================
         NORMALIZE BODY
      ========================== */
      const body = {
        title: req.body.title,
        description: req.body.description,

        totalQuestions: Number(req.body.totalQuestions),

        // ✅ FIXED FIELD NAMES
        timePerQuestion: Number(req.body.time_per_question),
        durationMinutes: Number(req.body.durationMinutes),
        totalMarks: Number(req.body.total_marks),
        passingMarks: Number(req.body.passing_marks),

        negativeMarking: req.body.negative_marking === "true",
        negativeMarksPerQuestion:
          req.body.negative_marking === "true"
            ? Number(req.body.negative_marks_per_question)
            : null,

        isFree: req.body.is_free === "true",
        price:
          req.body.is_free === "true"
            ? null
            : Number(req.body.price),

        attemptLimit: req.body.attempt_limit
          ? Number(req.body.attempt_limit)
          : null,

        status: req.body.status || "draft",

        showHints: req.body.show_hints === "true",
        showExplanations: req.body.show_explanations === "true",
        shuffleQuestions: req.body.shuffle_questions === "true",
        shuffleOptions: req.body.shuffle_options === "true",
      };


      /* =========================
         REQUIRED VALIDATION
      ========================== */


      /* =========================
         IMAGE UPLOAD
      ========================== */
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadToS3(file, "quizzes");
      }

      body.image = imageUrl ? imageUrl : "https://i.ibb.co/yJKhCyd/Screenshot-2026-01-27-at-4-59-46-PM.png"

      /* =========================
         CREATE
      ========================== */
      const quiz = await Quizzes.create(body);

      await clearAllQuizCache();

      return res.status(201).json({
        success: true,
        message: "Quiz created successfully",
        data: quiz,
      });
    } catch (error) {
      console.error("Create Quiz Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /* =========================
     UPDATE QUIZ
  ========================== */
  static async updateQuiz(req, res) {
    try {
      const { id } = req.params;
      const file = req.file;

      const quiz = await Quizzes.findByPk(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }

      /* =========================
         NORMALIZE BODY (MODEL KE NAAM)
      ========================== */
      const body = {
        title: req.body.title ?? quiz.title,
        description: req.body.description ?? quiz.description,

        totalQuestions:
          req.body.totalQuestions !== undefined
            ? Number(req.body.totalQuestions)
            : quiz.totalQuestions,

        timePerQuestion:
          req.body.time_per_question !== undefined
            ? Number(req.body.time_per_question)
            : quiz.timePerQuestion,

        durationMinutes:
          req.body.durationMinutes !== undefined
            ? Number(req.body.durationMinutes)
            : quiz.durationMinutes,

        totalMarks:
          req.body.total_marks !== undefined
            ? Number(req.body.total_marks)
            : quiz.totalMarks,

        passingMarks:
          req.body.passing_marks !== undefined
            ? Number(req.body.passing_marks)
            : quiz.passingMarks,

        negativeMarking:
          req.body.negative_marking !== undefined
            ? req.body.negative_marking === "true"
            : quiz.negativeMarking,

        negativeMarksPerQuestion:
          req.body.negative_marking === "true"
            ? Number(req.body.negative_marks_per_question)
            : null,

        isFree:
          req.body.is_free !== undefined
            ? req.body.is_free === "true"
            : quiz.isFree,

        price:
          req.body.is_free === "true"
            ? null
            : req.body.price !== undefined
              ? Number(req.body.price)
              : quiz.price,

        attemptLimit:
          req.body.attempt_limit !== undefined
            ? Number(req.body.attempt_limit)
            : quiz.attemptLimit,

        status: req.body.status ?? quiz.status,

        showHints:
          req.body.show_hints !== undefined
            ? req.body.show_hints === "true"
            : quiz.showHints,

        showExplanations:
          req.body.show_explanations !== undefined
            ? req.body.show_explanations === "true"
            : quiz.showExplanations,

        shuffleQuestions:
          req.body.shuffle_questions !== undefined
            ? req.body.shuffle_questions === "true"
            : quiz.shuffleQuestions,

        shuffleOptions:
          req.body.shuffle_options !== undefined
            ? req.body.shuffle_options === "true"
            : quiz.shuffleOptions,
      };

      /* =========================
         IMAGE HANDLING
      ========================== */
      let imageUrl = quiz.image;

      if (file) {
        if (quiz.image) {
          await deleteFromS3(quiz.image);
        }
        imageUrl = await uploadToS3(file, "quizzes");
      }

      body.image = imageUrl;

      /* =========================
         UPDATE
      ========================== */
      await quiz.update(body);

      await deleteQuizCache(id);
      await clearAllQuizCache();

      return res.json({
        success: true,
        message: "Quiz updated successfully",
        data: quiz,
      });
    } catch (error) {
      console.error("Update Quiz Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  /* =========================
     DELETE QUIZ
  ========================== */
  static async deleteQuiz(req, res) {
    try {
      const { id } = req.params;

      const quiz = await Quizzes.findByPk(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }

      if (quiz.image) {
        await deleteFromS3(quiz.image);
      }

      await quiz.destroy();

      await deleteQuizCache(id);
      await clearAllQuizCache();

      return res.json({
        success: true,
        message: "Quiz deleted successfully",
      });
    } catch (error) {
      console.error("Delete Quiz Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /* =========================
     GET ALL QUIZZES
  ========================== */
static async getAllQuizzes(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // 👮 Admin check
    const isAdmin = req.query.is_admin === "true";

    /* ================= WHERE CONDITION ================= */
    const where = {};

    // 🔐 Non-admin → only published
    if (!isAdmin) {
      where.status = "published";
    }

    // 🔍 Search
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { rows, count } = await Quizzes.findAndCountAll({
      where,
      attributes: {
        include: [
          // 🧾 TOTAL PURCHASE COUNT FOR QUIZ
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM orders AS o
              WHERE 
                o.itemId = Quizzes.id
                AND o.type = 'quiz'
                AND o.status = 'success'
            )`),
            "totalPurchases",
          ],
        ],
      },
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Get All Quizzes Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

  /* =========================
     GET SINGLE QUIZ
  ========================== */
  static async getSingleQuiz(req, res) {
    try {
      const { id } = req.params;

      const cachedQuiz = await getQuizCache(id);
      if (cachedQuiz) {
        return res.json({
          success: true,
          data: cachedQuiz,
          cached: true,
        });
      }

      const quiz = await Quizzes.findByPk(id);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }

      await setQuizCache(id, quiz);

      return res.json({
        success: true,
        data: quiz,
      });
    } catch (error) {
      console.error("Get Single Quiz Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = QuizController;
