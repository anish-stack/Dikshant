'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('faqs', [
      {
        question: 'How can I enroll in a batch?',
        answer: 'You can enroll directly through our app or website using the batch details page.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'Is there any scholarship test available?',
        answer: 'Yes, we conduct scholarship tests regularly. Check the announcements section for updates.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'Can I download video lectures?',
        answer: 'Video lectures are not downloadable, but you can watch them anytime within the app.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        question: 'Do you provide test series?',
        answer: 'Yes, we offer comprehensive Prelims and Mains test series for UPSC and State PCS.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('faqs', null, {});
  }
};
