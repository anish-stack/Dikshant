'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('programs', [
      {
        name: 'IAS Foundation Program',
        slug: 'ias-foundation-program',
        imageUrl: 'https://yourcdn.com/programs/ias-foundation.jpg',
        description: 'A comprehensive program covering UPSC Prelims and Mains syllabus with mentoring and test series.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'PCS Target Program',
        slug: 'pcs-target-program',
        imageUrl: 'https://yourcdn.com/programs/pcs-target.jpg',
        description: 'Specially designed for State PCS examinations with focused modules and current affairs support.',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'UPSC Prelims Crash Course',
        slug: 'upsc-prelims-crash-course',
        imageUrl: 'https://yourcdn.com/programs/prelims-crash.jpg',
        description: 'Fast-track crash course for UPSC Prelims exam, designed for quick revision and practice.',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('programs', null, {});
  }
};
