'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('mcqresults', [
      // ----------------------------------------------------
      // Result for User 1, Test Series 1, Test 1, Question 1
      // ----------------------------------------------------
      {
        userId: 1,
        testSeriesId: 1,
        testId: 1,
        questionId: 1,
        subjectId: 1,

        selectedOptions: JSON.stringify([1]),
        correctOptions: JSON.stringify([1]),
        
        isCorrect: true,
        score: 2,
        timeTaken: 35,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ----------------------------------------------------
      // Result for User 1, Test Series 1, Test 1, Question 2
      // ----------------------------------------------------
      {
        userId: 1,
        testSeriesId: 1,
        testId: 1,
        questionId: 2,
        subjectId: 2,

        selectedOptions: JSON.stringify([0, 3]),
        correctOptions: JSON.stringify([0, 1, 3]),
        
        isCorrect: false,
        score: -0.66,
        timeTaken: 42,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ----------------------------------------------------
      // Result for User 2, Test Series 2, Test 3, Question 5
      // ----------------------------------------------------
      {
        userId: 2,
        testSeriesId: 2,
        testId: 3,
        questionId: 5,
        subjectId: 3,

        selectedOptions: JSON.stringify([1]),
        correctOptions: JSON.stringify([1]),
        
        isCorrect: true,
        score: 1,
        timeTaken: 21,

        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('mcqresults', null, {});
  }
};
