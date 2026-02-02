'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('banners', [
      {
        title: 'IAS Mega Scholarship Test',
        imageUrl: 'https://yourcdn.com/banners/scholarship-test.jpg',
        linkUrl: 'https://yourapp.com/scholarship',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'New Batch Starting Soon',
        imageUrl: 'https://yourcdn.com/banners/new-batch.jpg',
        linkUrl: 'https://yourapp.com/batches',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Download Mobile App',
        imageUrl: 'https://yourcdn.com/banners/mobile-app.jpg',
        linkUrl: 'https://yourapp.com/mobile-app',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('banners', null, {});
  }
};
