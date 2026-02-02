'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('scholarshipapplications', [
      {
        userId: 1,
        scholarshipId: 1,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 2,
        scholarshipId: 1,
        status: 'submitted',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 3,
        scholarshipId: 2,
        status: 'approved',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 4,
        scholarshipId: 3,
        status: 'rejected',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('scholarshipapplications', null, {});
  }
};
