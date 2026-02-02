'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_categories', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      title: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      subtitle: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      icon: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      screen: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      filter_key: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      gradient_start: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      gradient_end: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },

      students_label: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      coming_soon: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('app_categories');
  },
};
