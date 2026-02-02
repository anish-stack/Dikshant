'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('courseprogresses', [
      {
        userId: 1,
        batchId: 1,
        programId: 1,

        itemId: 10,
        itemType: 'video',

        progress: 45.5,
        completed: false,
        lastAccessedAt: new Date(),

        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 1,
        batchId: 1,
        programId: 1,

        itemId: 11,
        itemType: 'pdf',

        progress: 100,
        completed: true,
        lastAccessedAt: new Date(),

        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 2,
        batchId: 2,
        programId: 1,

        itemId: 20,
        itemType: 'video',

        progress: 10,
        completed: false,
        lastAccessedAt: new Date(),

        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('courseprogresses', null, {});
  }
};
