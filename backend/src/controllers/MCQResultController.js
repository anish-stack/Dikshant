'use strict';

const { MCQResult, MCQQuestion, Test, TestSeries } = require('../models');
const { normalizeArray } = require('../utils/helpers');

class MCQResultController {

  
  static async submitTest(req, res) {
    try {
      const { userId, testSeriesId, testId, answers } = req.body;

      if (!userId || !testSeriesId || !testId || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'userId, testSeriesId, testId, answers required' });
      }

      // optional: validate test exists & belongs to series
      const test = await Test.findByPk(testId);
      if (!test) return res.status(404).json({ message: 'Test not found' });

      // accumulate summary
      let totalQuestions = answers.length;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;
      let totalScore = 0;
      let totalTime = 0;

      const savedResults = [];

      for (const ans of answers) {
        const { questionId, selectedOptions, timeTaken } = ans;

        const question = await MCQQuestion.findByPk(questionId);
        if (!question) continue; // skip invalid question

        const correct = normalizeArray(question.correctOption);
        const selected = normalizeArray(selectedOptions);

        const isSkipped = selected.length === 0;

        // compare
        const isCorrect =
          !isSkipped &&
          JSON.stringify([...correct].sort()) === JSON.stringify([...selected].sort());

        // scoring (assuming fields in MCQQuestion)
        const positive = Number(question.positiveMarks || 1);
        const negative = Number(question.negativeMark || 0);

        let score = 0;
        if (isCorrect) score = positive;
        else if (!isSkipped && negative) score = -negative;

        if (isCorrect) correctCount++;
        else if (isSkipped) skippedCount++;
        else wrongCount++;

        totalScore += score;
        totalTime += Number(timeTaken || 0);

        const result = await MCQResult.create({
          userId,
          testSeriesId,
          testId,
          questionId,
          subjectId: question.subjectId,
          selectedOptions: selected,
          correctOptions: correct,
          isCorrect,
          score,
          timeTaken: timeTaken || 0
        });

        savedResults.push(result);
      }

      const accuracy =
        totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

      return res.status(201).json({
        message: 'Test submitted successfully',
        summary: {
          totalQuestions,
          correct: correctCount,
          wrong: wrongCount,
          skipped: skippedCount,
          totalScore,
          accuracy,
          totalTime
        },
        results: savedResults
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error submitting test', error });
    }
  }

  
  static async getTestResult(req, res) {
    try {
      const { userId, testId } = req.params;

      const results = await MCQResult.findAll({
        where: { userId, testId },
        include: [
          {
            model: MCQQuestion,
            as: 'question',
            attributes: ['id', 'question', 'options', 'subjectId']
          },
          {
            model: Test,
            as: 'test',
            attributes: ['id', 'title']
          },
          {
            model: TestSeries,
            as: 'series',
            attributes: ['id', 'title']
          }
        ],
        order: [['id', 'ASC']]
      });

      if (!results.length) {
        return res.status(404).json({ message: 'No results found for this test' });
      }

      const totalQuestions = results.length;
      const correct = results.filter(r => r.isCorrect).length;
      const skipped = results.filter(r => r.selectedOptions.length === 0).length;
      const wrong = totalQuestions - correct - skipped;
      const totalScore = results.reduce((s, r) => s + r.score, 0);
      const totalTime = results.reduce((s, r) => s + (r.timeTaken || 0), 0);
      const accuracy =
        totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

      return res.json({
        summary: {
          totalQuestions,
          correct,
          wrong,
          skipped,
          totalScore,
          accuracy,
          totalTime
        },
        results
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'Error fetching test result', error });
    }
  }
}

module.exports = MCQResultController;
