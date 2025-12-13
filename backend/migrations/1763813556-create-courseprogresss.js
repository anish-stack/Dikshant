'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('courseprogresses', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      batchId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      programId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      itemId: {
        type: Sequelize.INTEGER,   // videoId or pdfId
        allowNull: false
      },

      itemType: {
        type: Sequelize.ENUM("video", "pdf"),
        allowNull: false
      },

      progress: {
        type: Sequelize.FLOAT,     // percentage 0–100
        defaultValue: 0
      },

      completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      lastAccessedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('courseprogresses');
  }
};
