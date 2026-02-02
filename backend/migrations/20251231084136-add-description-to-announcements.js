'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('announcements', 'description', {
      type: Sequelize.STRING,
      allowNull: true, // या false अगर required है
      defaultValue: null // optional
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('announcements', 'description');
  }
};