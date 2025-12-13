'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('batchs', [
      {
        name: 'IAS Foundation Batch 2025',
        slug: 'ias-foundation-2025',
        imageUrl: 'https://yourcdn.com/batches/ias-foundation.jpg',

        displayOrder: 1,
        programId: 1,
        subjectId: JSON.stringify([1, 2, 3]),

        startDate: new Date('2025-01-10'),
        endDate: new Date('2025-09-30'),

        registrationStartDate: new Date('2024-12-01'),
        registrationEndDate: new Date('2025-01-09'),

        status: 'active',

        shortDescription: 'Complete IAS Foundation Batch for beginners.',
        longDescription: 'This batch covers Prelims + Mains with detailed lectures, notes, and practice tests.',

        batchPrice: 35000,
        batchDiscountPrice: 29999,
        gst: 18,
        offerValidityDays: 15,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        name: 'UPSC Prelims Crash Course',
        slug: 'upsc-prelims-crash-2025',
        imageUrl: 'https://yourcdn.com/batches/prelims-crash.jpg',

        displayOrder: 2,
        programId: 1,
        subjectId: JSON.stringify([4, 5, 6]),

        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-05-20'),

        registrationStartDate: new Date('2025-01-15'),
        registrationEndDate: new Date('2025-02-28'),

        status: 'active',

        shortDescription: 'Crash course designed for fast revision.',
        longDescription: 'Contains daily tests, rapid revision classes, and expected question analysis.',

        batchPrice: 15000,
        batchDiscountPrice: 9999,
        gst: 18,
        offerValidityDays: 10,

        createdAt: new Date(),
        updatedAt: new Date()
      },

      {
        name: 'PCS Special Batch 2025',
        slug: 'pcs-special-2025',
        imageUrl: 'https://yourcdn.com/batches/pcs-batch.jpg',

        displayOrder: 3,
        programId: 2,
        subjectId: JSON.stringify([2, 7]),

        startDate: new Date('2025-02-05'),
        endDate: new Date('2025-10-01'),

        registrationStartDate: new Date('2024-12-20'),
        registrationEndDate: new Date('2025-02-04'),

        status: 'inactive',

        shortDescription: 'PCS special batch for prelims + mains preparation.',
        longDescription: 'Includes static topics + current affairs + test series + mentorship sessions.',

        batchPrice: 28000,
        batchDiscountPrice: 22999,
        gst: 18,
        offerValidityDays: 20,

        createdAt: new Date(),
        updatedAt: new Date()
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('batchs', null, {});
  }
};
