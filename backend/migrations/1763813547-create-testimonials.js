'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('testimonials', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      name: {
        type: Sequelize.STRING
      },

      message: {
        type: Sequelize.TEXT
      },

      role: {
        type: Sequelize.STRING
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }

    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('testimonials');
  }
};
