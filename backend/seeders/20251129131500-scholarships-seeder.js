'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('scholarships', [
      {
        name: 'UPSC Scholarship Test 2025',
        description: 'A scholarship test for UPSC aspirants to win discounts on IAS Foundation programs.',
        noOfQuestions: 50,
        duration: 60, // minutes
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'PCS Merit Scholarship',
        description: 'Special scholarship test for PCS aspirants with merit-based rewards.',
        noOfQuestions: 40,
        duration: 45,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'General Aptitude Scholarship Exam',
        description: 'Aptitude-based scholarship test open for all competitive exam students.',
        noOfQuestions: 30,
        duration: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('scholarships', null, {});
  }
};
