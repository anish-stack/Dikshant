'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('announcements', [
      {
        title: 'New Batch Launch',
        message: 'IAS/PCS new batch starting from next Monday. Enroll now!',
        publishDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Holiday Notice',
        message: 'Institute will remain closed on 2nd October due to Gandhi Jayanti.',
        publishDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Test Series Update',
        message: 'New scholarship test series has been uploaded. Attempt from dashboard.',
        publishDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('announcements', null, {});
  }
};
