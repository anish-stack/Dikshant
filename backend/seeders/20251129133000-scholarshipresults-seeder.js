'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('scholarshipresults', [
      {
        userId: 1,
        scholarshipId: 1,

        totalQuestions: 50,
        correct: 42,
        wrong: 6,
        skipped: 2,

        positiveMarks: 84,  // 42×2
        negativeMarks: -3,  // 6×-0.5
        totalScore: 81,     // 84 - 3
        accuracy: 84,       // % correct

        timeTaken: 1800, // in seconds (30 min)

        answers: JSON.stringify([
          { qid: 1, selected: [1], correct: [1], isCorrect: true },
          { qid: 2, selected: [0, 3], correct: [0, 1, 3], isCorrect: false }
        ]),

        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        userId: 2,
        scholarshipId: 1,

        totalQuestions: 50,
        correct: 20,
        wrong: 20,
        skipped: 10,

        positiveMarks: 40,
        negativeMarks: -10,
        totalScore: 30,
        accuracy: 40,

        timeTaken: 2500,

        answers: JSON.stringify([]),

        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        userId: 3,
        scholarshipId: 2,

        totalQuestions: 30,
        correct: 15,
        wrong: 10,
        skipped: 5,

        positiveMarks: 30,
        negativeMarks: -5,
        totalScore: 25,
        accuracy: 50,

        timeTaken: 2000,

        answers: JSON.stringify([]),

        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('scholarshipresults', null, {});
  }
};
