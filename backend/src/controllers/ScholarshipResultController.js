"use strict";
const { Scholarship, ScholarshipMCQQuestion, ScholarshipResult } = require("../models");

class ScholarshipResultController {

  static async submit(req, res) {
    try {
      const { userId, scholarshipId, answers } = req.body;

      const scholarship = await Scholarship.findByPk(scholarshipId);
      if (!scholarship) return res.status(404).json({ message: "Scholarship not found" });

      let correct = 0, wrong = 0, skipped = 0;
      let positiveMarks = 0, negativeMarks = 0;
      let totalScore = 0, timeTaken = 0;

      let detailed = [];

      for (let ans of answers) {
        let q = await ScholarshipMCQQuestion.findByPk(ans.questionId);
        if (!q) continue;

        let correctOpt = JSON.parse(q.correctOption);
        let selected = ans.selected || [];

        let isCorrect = JSON.stringify(selected.sort()) === JSON.stringify(correctOpt.sort());

        let score = 0;

        if (selected.length === 0) {
          skipped++;
        } else if (isCorrect) {
          correct++;
          score = q.positiveMarks;
          positiveMarks += q.positiveMarks;
        } else {
          wrong++;
          score = -q.negativeMark;
          negativeMarks += q.negativeMark;
        }

        totalScore += score;
        timeTaken += ans.timeTaken || 0;

        detailed.push({
          questionId: q.id,
          selected,
          correct: correctOpt,
          isCorrect,
          score
        });
      }

      let accuracy = (correct / scholarship.noOfQuestions) * 100;

      const result = await ScholarshipResult.create({
        userId,
        scholarshipId,
        totalQuestions: scholarship.noOfQuestions,
        correct,
        wrong,
        skipped,
        positiveMarks,
        negativeMarks,
        totalScore,
        accuracy,
        timeTaken,
        answers: detailed
      });

      return res.json({ message: "Test submitted", result });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error submitting test", error });
    }
  }

  static async getResult(req, res) {
    const { userId, scholarshipId } = req.params;

    const result = await ScholarshipResult.findOne({ where: { userId, scholarshipId } });

    if (!result) return res.status(404).json({ message: "Result not found" });

    return res.json(result);
  }

  static async getMeritList(req, res) {
    try {
      const { scholarshipId } = req.params;

      const results = await ScholarshipResult.findAll({
        where: { scholarshipId },
        order: [
          ["totalScore", "DESC"],
          ["timeTaken", "ASC"],
          ["accuracy", "DESC"]
        ]
      });

      let rank = 1;
      const ranked = results.map(r => ({
        rank: rank++,
        userId: r.userId,
        totalScore: r.totalScore,
        accuracy: r.accuracy,
        timeTaken: r.timeTaken
      }));

      return res.json(ranked);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error generating merit list", error });
    }
  }
  static async downloadPDF(req, res) {
    try {
      const { userId, scholarshipId } = req.params;

      const result = await ScholarshipResult.findOne({ where: { userId, scholarshipId } });
      if (!result) return res.status(404).json({ message: "Result not found" });

      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=result.pdf");

      doc.pipe(res);

      doc.fontSize(22).text("Scholarship Result Summary", { align: "center" });
      doc.moveDown();

      doc.fontSize(14).text(`User ID: ${userId}`);
      doc.text(`Scholarship ID: ${scholarshipId}`);
      doc.text(`Total Questions: ${result.totalQuestions}`);
      doc.text(`Correct: ${result.correct}`);
      doc.text(`Wrong: ${result.wrong}`);
      doc.text(`Skipped: ${result.skipped}`);
      doc.text(`Score: ${result.totalScore}`);
      doc.text(`Accuracy: ${result.accuracy}%`);
      doc.text(`Time Taken: ${result.timeTaken} sec`);

      doc.end();

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error creating PDF", error });
    }
  }


}

module.exports = ScholarshipResultController;
