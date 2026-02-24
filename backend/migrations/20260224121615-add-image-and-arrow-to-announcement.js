'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
   await queryInterface.addColumn('announcements', 'image', {
  type: Sequelize.STRING,
  allowNull: true,
});

await queryInterface.addColumn('announcements', 'imageAltText', {
  type: Sequelize.STRING,
  allowNull: true,
});

await queryInterface.addColumn('announcements', 'arrowColor', {
  type: Sequelize.STRING,
  allowNull: true,
  defaultValue: '#ffffff',
});

await queryInterface.addColumn('announcements', 'arrowBackgroundColor', {
  type: Sequelize.STRING,
  allowNull: true,
  defaultValue: '#000000',
});
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
