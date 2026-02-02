'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('pdfnotes', [
      {
        title: 'Polity Notes – Basics of Constitution',
        fileUrl: 'https://yourcdn.com/notes/polity-basics.pdf',
        programId: 1,
        batchId: 1,
        subjectId: 2,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'History Notes – Ancient India',
        fileUrl: 'https://yourcdn.com/notes/ancient-india.pdf',
        programId: 1,
        batchId: 1,
        subjectId: 3,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Geography Notes – Physical Geography',
        fileUrl: 'https://yourcdn.com/notes/physical-geography.pdf',
        programId: 2,
        batchId: 3,
        subjectId: 4,
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('pdfnotes', null, {});
  }
};
