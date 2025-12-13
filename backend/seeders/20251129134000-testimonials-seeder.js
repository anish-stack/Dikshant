'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('testimonials', [
      {
        name: 'Rahul Sharma',
        message: 'The IAS Foundation course was extremely helpful. The teachers explain everything clearly and the test series boosted my confidence.',
        role: 'UPSC Aspirant',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Priya Verma',
        message: 'Best coaching experience so far. Notes, video lectures, and guidance — everything is well structured.',
        role: 'PCS Aspirant',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Amit Kumar',
        message: 'The crash course helped me revise the entire syllabus in a very short time. Highly recommended!',
        role: 'UPSC Prelims Student',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('testimonials', null, {});
  }
};
