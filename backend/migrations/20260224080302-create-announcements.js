'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('announcements', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      publishDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      /* ==========================
         Styling Fields
      ========================== */

      textColor: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '#000000',
      },

      backgroundColor: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '#ffffff',
      },

      width: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: '100%',
      },

      height: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'auto',
      },

      containerStyle: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('announcements');
  },
};