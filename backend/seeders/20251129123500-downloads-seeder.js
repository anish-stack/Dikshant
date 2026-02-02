'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('downloads', [
      {
        userId: 1,
        type: 'pdf',
        title: 'Polity Notes Chapter 1',
        fileUrl: 'https://yourcdn.com/downloads/polity-ch1.pdf',
        itemId: 101,
        programId: 1,
        batchId: 1,
        subjectId: 2,
        downloadedAt: new Date(),
        deviceInfo: 'Android Phone - Chrome Browser',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 1,
        type: 'video',
        title: 'History Lecture 5',
        fileUrl: 'https://yourcdn.com/videos/history-lecture5.mp4',
        itemId: 55,
        programId: 1,
        batchId: 1,
        subjectId: 3,
        downloadedAt: new Date(),
        deviceInfo: 'Windows PC - Chrome Browser',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 2,
        type: 'note',
        title: 'Geography Printed Notes',
        fileUrl: 'https://yourcdn.com/notes/geography-notes.pdf',
        itemId: 78,
        programId: 2,
        batchId: 3,
        subjectId: 4,
        downloadedAt: new Date(),
        deviceInfo: 'iPhone Safari',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('downloads', null, {});
  }
};
