'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('blogs', [
      {
        title: 'How to Prepare for UPSC CSE 2025',
        imageUrl: 'https://yourcdn.com/blogs/upsc-guide.jpg',
        slug: 'how-to-prepare-for-upsc-cse-2025',
        content: 'A complete guide for UPSC CSE preparation including strategy, books, and timetable.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Top 10 Tips for UPSC Prelims',
        imageUrl: 'https://yourcdn.com/blogs/tips-prelims.jpg',
        slug: 'top-10-upsc-prelims-tips',
        content: 'These 10 tips will improve your prelims score significantly. Follow them carefully!',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        title: 'Current Affairs Strategy for UPSC',
        imageUrl: 'https://yourcdn.com/blogs/current-affairs.jpg',
        slug: 'current-affairs-strategy-upsc',
        content: 'Learn the right way to cover newspapers, monthly magazines, and PIB for UPSC exam.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('blogs', null, {});
  }
};
