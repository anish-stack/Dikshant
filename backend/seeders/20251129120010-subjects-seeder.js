'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('subjects', [
      {
        name: 'Polity',
        slug: 'polity',
        description: 'Indian Constitution, Governance, and Political System',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Geography',
        slug: 'geography',
        description: 'Physical, Human and Indian Geography',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'History',
        slug: 'history',
        description: 'Ancient, Medieval and Modern Indian History',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Economy',
        slug: 'economy',
        description: 'Indian Economy, Budget, Economic Reforms, Banking',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Environment',
        slug: 'environment',
        description: 'Ecology, Biodiversity, Climate Change',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Science & Tech',
        slug: 'science-technology',
        description: 'Basic Science, Space, Defence, Innovations',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('subjects', null, {});
  }
};
