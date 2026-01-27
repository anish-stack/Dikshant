const { QuizQuestions, Quizzes, QuizQuestionOptions, QuizPayments, QuizAttempts } = require("../models");
const XLSX = require("xlsx");

const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";
const toNum = (v) =>
  v === undefined || v === null || v === "" || isNaN(v) ? null : Number(v);

const validateQuestion = (q, isUpdate = false) => {
  if (!isUpdate && !q.question_text?.trim()) return "Question text is required";
  if (q.marks !== undefined && toNum(q.marks) === null)
    return "Marks must be a valid number";
  if (q.order_num !== undefined && toNum(q.order_num) === null)
    return "Order number must be a valid number";
  return null;
};

class QuizQuestionsController {
  // Handle question image upload/replace
  static async handleQuestionImage(file, oldImageUrl = null) {
    if (!file) return null;
    try {
      const result = await uploadToS3(file);
      if (oldImageUrl) {
        await deleteFromS3(oldImageUrl).catch(() => { });
      }
      return result.Location;
    } catch (err) {
      console.error("S3 Upload Error:", err);
      throw new Error("Failed to upload question image");
    }
  }

  // Manage options: delete old, add new (with optional images)
  static async manageOptions(questionId, optionsData = [], files = {}) {
    if (optionsData.length < 2) {
      throw new Error("At least 2 options are required");
    }

    const correctCount = optionsData.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error("Exactly one option must be marked as correct");
    }

    // Delete existing options
    await QuizQuestionOptions.destroy({ where: { question_id: questionId } });

    const newOptions = [];
    for (let i = 0; i < optionsData.length; i++) {
      const opt = optionsData[i];
      let optionImage = opt.optionImage || null;

      // Handle uploaded image for this option
      const fileKey = `option_image_${i}`;
      if (files[fileKey]?.[0]) {
        const uploadResult = await uploadToS3(files[fileKey][0]);
        optionImage = uploadResult.Location;
      }

      newOptions.push({
        question_id: questionId,
        option_text: opt.optionText?.trim() || "",
        option_image: optionImage,
        is_correct: !!opt.isCorrect,
        order_num: opt.orderNum || i + 1,
      });
    }

    await QuizQuestionOptions.bulkCreate(newOptions);
  }

  // ADD SINGLE QUESTION + OPTIONS
  static async addSingleQuestion(req, res) {
    const transaction = await QuizQuestions.sequelize.transaction();
    try {
      const { quizId } = req.params;

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) {
        return res.status(404).json({ success: false, message: "Quiz not found" });
      }

      const error = validateQuestion(req.body);
      if (error) {
        return res.status(400).json({ success: false, message: error });
      }

      let questionImage = null;
      if (req.file) {
        questionImage = await QuizQuestionsController.handleQuestionImage(req.file);
      }

      const question = await QuizQuestions.create(
        {
          quiz_id: quizId,
          question_text: req.body.question_text.trim(),
          question_type: req.body.question_type || "multiple_choice",
          explanation: req.body.explanation?.trim() || null,
          hint: req.body.hint?.trim() || null,
          marks: toNum(req.body.marks),
          time_limit: toNum(req.body.time_limit),
          order_num:
            toNum(req.body.order_num) ||
            (await QuizQuestions.count({ where: { quiz_id: quizId } })) + 1,
          is_question_have_image: !!questionImage,
          question_image: questionImage,
        },
        { transaction }
      );

      // Handle options if provided
      if (req.body.options) {
        let options = req.body.options;
        if (typeof options === "string") {
          try {
            options = JSON.parse(options);
          } catch {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: "Invalid JSON in options field",
            });
          }
        }
        await QuizQuestionsController.manageOptions(question.id, options, req.files);
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: "Question and options added successfully",
        data: question,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Add Question Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // UPDATE QUESTION + OPTIONS
  static async updateQuestion(req, res) {
    const transaction = await QuizQuestions.sequelize.transaction();
    try {
      const { quizId, questionId } = req.params;

      const question = await QuizQuestions.findOne({
        where: { id: questionId, quiz_id: quizId },
      });
      if (!question) {
        return res.status(404).json({ success: false, message: "Question not found" });
      }

      const error = validateQuestion(req.body, true);
      if (error) {
        return res.status(400).json({ success: false, message: error });
      }

      let questionImage = question.question_image;
      if (req.file) {
        questionImage = await QuizQuestionsController.handleQuestionImage(req.file, question.question_image);
      } else if (req.body.question_image !== undefined) {
        questionImage = req.body.question_image || null;
      }

      await question.update(
        {
          question_text: req.body.question_text?.trim() || question.question_text,
          question_type: req.body.question_type || question.question_type,
          explanation:
            req.body.explanation !== undefined
              ? req.body.explanation?.trim() || null
              : question.explanation,
          hint:
            req.body.hint !== undefined
              ? req.body.hint?.trim() || null
              : question.hint,
          marks: req.body.marks !== undefined ? toNum(req.body.marks) : question.marks,
          time_limit:
            req.body.time_limit !== undefined ? toNum(req.body.time_limit) : question.time_limit,
          order_num:
            req.body.order_num !== undefined ? toNum(req.body.order_num) : question.order_num,
          is_question_have_image: !!questionImage,
          question_image: questionImage,
        },
        { transaction }
      );

      // Update options if sent
      if (req.body.options) {
        let options = req.body.options;
        if (typeof options === "string") {
          try {
            options = JSON.parse(options);
          } catch {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: "Invalid JSON in options field",
            });
          }
        }
        await QuizQuestionsController.manageOptions(question.id, options, req.files);
      }

      await transaction.commit();

      return res.json({
        success: true,
        message: "Question and options updated successfully",
        data: await question.reload({
          include: [{ model: QuizQuestionOptions, as: "options" }],
        }),
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Update Question Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // DELETE QUESTION → OPTIONS AUTO DELETED
  static async deleteQuestion(req, res) {
    try {
      const { quizId, questionId } = req.params;

      const question = await QuizQuestions.findOne({
        where: { id: questionId, quiz_id: quizId },
      });
      if (!question) {
        return res.status(404).json({ success: false, message: "Question not found" });
      }

      // Delete question image from S3
      if (question.question_image) {
        await deleteFromS3(question.question_image).catch(() => { });
      }

      await question.destroy();

      // Reorder remaining questions
      const remaining = await QuizQuestions.findAll({
        where: { quiz_id: quizId },
        order: [["order_num", "ASC"]],
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order_num !== i + 1) {
          await remaining[i].update({ order_num: i + 1 });
        }
      }

      return res.json({
        success: true,
        message: "Question and its options deleted successfully",
      });
    } catch (error) {
      console.error("Delete Question Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // GET ALL QUESTIONS WITH OPTIONS
  static async getQuizQuestions(req, res) {
    try {
      const { quizId } = req.params;

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) {
        return res.status(404).json({ success: false, message: "Quiz not found" });
      }

      const questions = await QuizQuestions.findAll({
        where: { quiz_id: quizId },
        order: [["order_num", "ASC"]],
        include: [
          {
            model: QuizQuestionOptions,
            as: "options",
            order: [["order_num", "ASC"]],
          },
        ],
      });

      return res.json({
        success: true,
        count: questions.length,
        data: questions,
      });
    } catch (error) {
      console.error("Get Questions Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // ADD BULK QUESTIONS + OPTIONS (from JSON)
  static async addBulkQuestions(req, res) {
    const transaction = await QuizQuestions.sequelize.transaction();
    try {
      const { quizId } = req.params;
      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Questions array is required and cannot be empty",
        });
      }

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) {
        return res.status(404).json({ success: false, message: "Quiz not found" });
      }

      const currentCount = await QuizQuestions.count({ where: { quiz_id: quizId } });
      const createdQuestions = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        const error = validateQuestion(q);
        if (error) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Question ${i + 1}: ${error}`,
          });
        }

        // Create question
        const question = await QuizQuestions.create(
          {
            quiz_id: quizId,
            question_text: q.question_text.trim(),
            question_type: q.question_type || "multiple_choice",
            explanation: q.explanation?.trim() || null,
            hint: q.hint?.trim() || null,
            marks: toNum(q.marks),
            time_limit: toNum(q.time_limit),
            order_num: toNum(q.order_num) || currentCount + i + 1,
            is_question_have_image: toBool(q.is_question_have_image),
            question_image: q.question_image || null,
          },
          { transaction }
        );

        // Add options if provided
        if (q.options && Array.isArray(q.options) && q.options.length >= 2) {
          await QuizQuestionsController.manageOptions(question.id, q.options, {});
        }

        createdQuestions.push(question);
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: `${createdQuestions.length} questions with options added successfully`,
        data: createdQuestions,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Bulk Questions Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  static async addQuestionsFromExcel(req, res) {
    const transaction = await QuizQuestions.sequelize.transaction();
    try {
      const { quizId } = req.params;

      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ success: false, message: "Excel file is required" });
      }

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) return res.status(404).json({ success: false, message: "Quiz not found" });

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      if (rows.length === 0) return res.status(400).json({ success: false, message: "Excel file is empty" });

      // ← FIX: quiz_id use karo
      const existingCount = await QuizQuestions.count({
        where: { quiz_id: quizId },
      });

      let createdCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const questionText = row.question_text?.toString().trim();
        const marks = toNum(row.marks);
        const correctAnswer_excel = (row.correct_answer || "").toString().trim().toUpperCase();

        console.log("correctAnswer_excel ", correctAnswer_excel);
        // Validation...
        if (!questionText) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: `Row ${i + 2}: Question text required` });
        }

        // Options validation...
        const optionsRaw = [
          { key: "A", text: row.option_a },
          { key: "B", text: row.option_b },
          { key: "C", text: row.option_c },
          { key: "D", text: row.option_d },
        ];

        for (const opt of optionsRaw) {
          if (!opt.text?.toString().trim()) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: `Row ${i + 2}: Option ${opt.key} required` });
          }
        }

        const correctAnswer = (row.correct_answer || "").toString().trim().toUpperCase();
        if (!["A", "B", "C", "D"].includes(correctAnswer)) {
          await transaction.rollback();
          return res.status(400).json({ success: false, message: `Row ${i + 2}: correct_answer must be A/B/C/D` });
        }

        // ← FIX: quiz_id use karo
        const question = await QuizQuestions.create(
          {
            quiz_id: quizId,
            question_text: questionText,
            question_type: "multiple_choice",
            explanation: row.explanation?.toString().trim() || null,
            hint: row.hint?.toString().trim() || null,
            marks,
            time_limit: toNum(row.time_limit),
            order_num: toNum(row.order_num) || existingCount + createdCount + 1,
            is_question_have_image: false,
            question_image: null,
          },
          { transaction }
        );


        // ← FIX: question_id use karo
        const options = optionsRaw.map((opt, idx) => ({
          question_id: question.id,
          option_text: opt.text.toString().trim(),
          option_image: null,
          is_correct: opt.key === correctAnswer_excel,
          order_num: idx + 1,
        }));

        await QuizQuestionOptions.bulkCreate(options, { transaction });
        createdCount++;
      }

      await transaction.commit();

      return res.status(201).json({
        success: true,
        message: `${createdCount} questions with options uploaded successfully!`,
        count: createdCount,
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Excel Upload Error:", error);
      return res.status(500).json({ success: false, message: "Failed to process Excel file" });
    }
  }



  static async getQuizStatistics(req, res) {
    try {
      const { userId, quizId } = req.params;

      const quiz = await Quizzes.findByPk(quizId);
      if (!quiz) {
        return res.status(404).json({ success: false, message: "Quiz not found" });
      }
      const attempts = await QuizAttempts.findAll({ where: { user_id: userId, quiz_id: quizId } });

      if (attempts.length === 0) {
        return res.status(200).json({ success: true, attempt: 0, message: "No attempts found for this user on the specified quiz" });
      } 

      const leftAttempts = quiz.attempt_limit - attempts.length;
      return res.status(200).json({ success: true, attempt: attempts.length, leftAttempts });

    } catch (error) {
      console.error("Get Quiz Statistics Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  


}

module.exports = QuizQuestionsController;