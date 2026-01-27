"use strict";

const {
  QuizAttempts,
  Quizzes,
  QuizQuestions,
  QuizQuestionOptions,
  StudentAnswers,
  Order,
  sequelize,
  User
} = require("../models");
const redis = require("../config/redis");

class QuizResultController {

  static async getUserAllAttempts(req, res) {
    try {
      const userId = req.user.id;

      console.log("GET USER ALL ATTEMPTS:", { userId });

      const attempts = await QuizAttempts.findAll({
        where: { userId },
        include: [
          {
            model: Quizzes,
            attributes: ["id", "title", "image", "durationMinutes", "totalQuestions", "totalMarks"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      if (attempts.length === 0) {
        return res.json({
          success: true,
          message: "No attempts found",
          attempts: [],
        });
      }

      const formattedAttempts = attempts.map((attempt) => ({
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.started_at,
        completedAt: attempt.completedAt,
        score: attempt.totalMarksObtained || null,
        percentage: attempt.percentage || null,
        passed: attempt.totalMarksObtained >= attempt.Quizz?.passingMarks,
        quiz: {
          id: attempt.Quizz.id,
          title: attempt.Quizz.title,
          image: attempt.Quizz.image,
          durationMinutes: attempt.Quizz.durationMinutes,
          totalQuestions: attempt.Quizz.totalQuestions,
          totalMarks: attempt.Quizz.totalMarks,
          passingMarks: attempt.Quizz.passingMarks,
        },
      }));

      return res.json({
        success: true,
        count: formattedAttempts.length,
        attempts: formattedAttempts,
      });
    } catch (error) {
      console.error("GET USER ALL ATTEMPTS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch attempts",
      });
    }
  }


  static async getUserAttemptsByQuiz(req, res) {
    try {
      const { quizId } = req.params;
      const userId = req.user.id;

      console.log("GET USER ATTEMPTS BY QUIZ:", { quizId, userId });

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }

      const attempts = await QuizAttempts.findAll({
        where: {
          userId,
          quizId,
        },
        order: [["attemptNumber", "DESC"]],
      });

      const formattedAttempts = attempts.map((attempt) => ({
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        score: attempt.totalMarksObtained || 0,
        percentage: attempt.percentage || 0,
        passed: attempt.totalMarksObtained >= quiz.passingMarks,
      }));

      return res.json({
        success: true,
        quizTitle: quiz.title,
        totalAttemptsAllowed: quiz.attemptLimit,
        attemptsCount: formattedAttempts.length,
        attempts: formattedAttempts,
      });
    } catch (error) {
      console.error("GET ATTEMPTS BY QUIZ ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch attempts",
      });
    }
  }


  static async getAttemptResult(req, res) {
    const transaction = await Quizzes.sequelize.transaction();

    try {
      const { attemptId } = req.params;
      console.log("FETCHING RESULT FOR ATTEMPT ID:", attemptId);

      const attempt = await QuizAttempts.findOne({
        where: {
          id: attemptId,
          status: "completed",
        },
        include: [
          {
            model: Quizzes,
            as: "quiz", // ✅ IMPORTANT
          },
        ],
        transaction,
      });

      if (!attempt) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Attempt result not found or not completed",
        });
      }

      const quiz = attempt.quiz; // ✅ FIXED

      /* ---------- Parse Question Order ---------- */
      let questionOrder = attempt.questionOrder || [];
      if (typeof questionOrder === "string") {
        try {
          questionOrder = JSON.parse(questionOrder);
        } catch {
          questionOrder = [];
        }
      }

      /* ---------- Fetch Answers ---------- */
      const userAnswers = await StudentAnswers.findAll({
        where: { attempt_id: attemptId },
        raw: true,
        transaction,
      });

      /* ---------- Fetch Questions ---------- */
      const questions = await QuizQuestions.findAll({
        where: { id: questionOrder },
        transaction,
      });

      /* ---------- Fetch Options ---------- */
      const allOptions = await QuizQuestionOptions.findAll({
        where: { question_id: questionOrder },
        raw: true,
        transaction,
      });

      /* ---------- Build Result ---------- */
      const resultQuestions = questionOrder.map((questionId) => {
        const question = questions.find((q) => q.id === questionId);
        const userAnswer = userAnswers.find(
          (a) => Number(a.questionId) === Number(questionId)
        );
        const correctOption = allOptions.find(
          (o) => o.question_id === questionId && o.is_correct === true
        );

        const questionOptions = allOptions
          .filter((o) => o.question_id === questionId)
          .map((o) => ({
            option_id: o.id,
            option_text: o.option_text,
            option_image: o.option_image,
            is_correct: o.is_correct,
          }))
          .sort((a, b) => a.option_id - b.option_id);

        return {
          question_id: questionId,
          question_text: question?.question_text || "Question not found",
          question_image: question?.question_image || null,
          user_selected_option_id: userAnswer?.selectedOptionId || null,
          correct_option_id: correctOption?.id || null,
          is_correct: Boolean(userAnswer?.isCorrect),
          marks_awarded: Number(userAnswer?.marksObtained || 0),
          marks_total: question?.marks || 0,
          explanation: quiz.show_explanations ? question?.explanation : null,
          hint: quiz.show_hints ? question?.hint : null,
          options: questionOptions,
        };
      });

      await transaction.commit();

      const totalMarks = quiz.totalMarks ?? quiz.total_marks ?? 0;
      const percentage =
        totalMarks > 0
          ? Number(
            ((attempt.totalMarksObtained / totalMarks) * 100).toFixed(2)
          )
          : 0;

      return res.json({
        success: true,
        data: {
          attemptId: attempt.id,
          attemptNumber: attempt.attemptNumber,
          quizId: quiz.id,
          quizTitle: quiz.title,
          score: attempt.totalMarksObtained,
          totalMarks,
          percentage,
          passingMarks: quiz.passingMarks,
          passed: attempt.totalMarksObtained >= quiz.passingMarks,
          totalQuestions: questionOrder.length,
          submittedAt: attempt.completedAt,
          questions: resultQuestions,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("GET ATTEMPT RESULT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch result",
      });
    }
  }


  static async getAllAttemptsByQuizAdmin(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: "Quiz not found",
        });
      }

      const attempts = await QuizAttempts.findAll({
        where: { quizId },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
        ],
       
      });

      const formattedAttempts = attempts.map((attempt) => ({
        attemptId: attempt.id,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        score: attempt.totalMarksObtained || 0,
        percentage: attempt.percentage || 0,
        passed: attempt.totalMarksObtained >= quiz.passingMarks,
        user: attempt.user,
      }));

      return res.json({
        success: true,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          totalMarks: quiz.totalMarks,
          passingMarks: quiz.passingMarks,
        },
        totalAttempts: formattedAttempts.length,
        data: formattedAttempts,
      });
    } catch (error) {
      console.error("ADMIN GET ALL ATTEMPTS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch quiz attempts",
      });
    }
  }
  static async getAttemptResultAdmin(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { attemptId } = req.params;

      const attempt = await QuizAttempts.findOne({
        where: { id: attemptId },
        include: [
          {
            model: Quizzes,
            as: "quiz",
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
          },
        ],
        transaction,
      });

      if (!attempt) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Attempt not found",
        });
      }

      const quiz = attempt.quiz;

      /* ---------- Question Order ---------- */
      let questionOrder = attempt.questionOrder || [];
      if (typeof questionOrder === "string") {
        questionOrder = JSON.parse(questionOrder || "[]");
      }

      /* ---------- Fetch Answers ---------- */
      const userAnswers = await StudentAnswers.findAll({
        where: { attempt_id: attemptId },
        raw: true,
        transaction,
      });

      /* ---------- Fetch Questions ---------- */
      const questions = await QuizQuestions.findAll({
        where: { id: questionOrder },
        transaction,
      });

      /* ---------- Fetch Options ---------- */
      const options = await QuizQuestionOptions.findAll({
        where: { question_id: questionOrder },
        raw: true,
        transaction,
      });

      /* ---------- Build Result ---------- */
      const resultQuestions = questionOrder.map((qid) => {
        const question = questions.find((q) => q.id === qid);
        const userAnswer = userAnswers.find(
          (a) => Number(a.questionId) === Number(qid)
        );
        const correctOption = options.find(
          (o) => o.question_id === qid && o.is_correct
        );

        return {
          questionId: qid,
          questionText: question?.question_text,
          userSelectedOptionId: userAnswer?.selectedOptionId || null,
          correctOptionId: correctOption?.id || null,
          isCorrect: Boolean(userAnswer?.isCorrect),
          marksAwarded: Number(userAnswer?.marksObtained || 0),
          marksTotal: question?.marks || 0,
          options: options.filter((o) => o.question_id === qid),
          explanation: question?.explanation,
          hint: question?.hint,
        };
      });

      await transaction.commit();

      const totalMarks = quiz.totalMarks || 0;
      const percentage =
        totalMarks > 0
          ? Number(
            ((attempt.totalMarksObtained / totalMarks) * 100).toFixed(2)
          )
          : 0;

      return res.json({
        success: true,
        data: {
          attemptId: attempt.id,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          score: attempt.totalMarksObtained,
          totalMarks,
          percentage,
          passed: attempt.totalMarksObtained >= quiz.passingMarks,
          submittedAt: attempt.completedAt,
          user: attempt.user,
          quiz: {
            id: quiz.id,
            title: quiz.title,
            passingMarks: quiz.passingMarks,
          },
          questions: resultQuestions,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("ADMIN GET ATTEMPT RESULT ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch attempt result",
      });
    }
  }


}

module.exports = QuizResultController;