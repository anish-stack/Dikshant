'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.bulkInsert('tests', [

      // ------------------------------------------------------
      // TEST 1 — UPSC Prelims Mock Test
      // ------------------------------------------------------
      {
        title: 'UPSC Prelims Mock Test 1',
        slug: 'upsc-prelims-mock-test-1',
        displayOrder: 1,

        testSeriesId: 1,

        reattemptAllowed: false,
        type: 'MOCK',

        resultGenerationTime: new Date('2025-04-10 18:00:00'),
        isDemo: false,

        duration: 120,
        status: 'active',

        startTime: new Date('2025-04-10 10:00:00'),
        endTime: new Date('2025-04-10 12:00:00'),

        solutionFileUrl: 'https://yourcdn.com/solutions/upsc-prelims-mock-1.pdf',

        languages: JSON.stringify(['English', 'Hindi']),

        subjectId: JSON.stringify([1, 2, 3]),
        noOfQuestions: JSON.stringify([30, 35, 35]),

        passingPercentage: 50,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ------------------------------------------------------
      // TEST 2 — UPSC Mains Practice Test
      // ------------------------------------------------------
      {
        title: 'UPSC Mains GS Paper 1 Practice Test',
        slug: 'upsc-mains-gs1-practice-test',
        displayOrder: 2,

        testSeriesId: 2,

        reattemptAllowed: true,
        type: 'EXERCISE',

        resultGenerationTime: new Date('2025-05-20 18:00:00'),
        isDemo: false,

        duration: 180,
        status: 'active',

        startTime: new Date('2025-05-20 09:00:00'),
        endTime: new Date('2025-05-20 12:00:00'),

        solutionFileUrl: 'https://yourcdn.com/solutions/mains-gs1-test.pdf',

        languages: JSON.stringify(['English']),

        subjectId: JSON.stringify([3]),
        noOfQuestions: JSON.stringify([20]),

        passingPercentage: 40,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      // ------------------------------------------------------
      // TEST 3 — PCS Practice Test (DEMO)
      // ------------------------------------------------------
      {
        title: 'PCS General Studies Demo Test',
        slug: 'pcs-general-studies-demo-test',
        displayOrder: 3,

        testSeriesId: 3,

        reattemptAllowed: true,
        type: 'NORMAL',

        resultGenerationTime: new Date('2025-03-05 18:00:00'),
        isDemo: true,

        duration: 60,
        status: 'inactive',

        startTime: new Date('2025-03-05 10:00:00'),
        endTime: new Date('2025-03-05 11:00:00'),

        solutionFileUrl: 'https://yourcdn.com/solutions/pcs-demo.pdf',

        languages: JSON.stringify(['Hindi']),

        subjectId: JSON.stringify([1, 4]),
        noOfQuestions: JSON.stringify([20, 20]),

        passingPercentage: 35,

        createdAt: new Date(),
        updatedAt: new Date()
      }

    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tests', null, {});
  }
};
