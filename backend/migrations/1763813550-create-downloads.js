'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('downloads', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      type: {
        type: Sequelize.ENUM("pdf", "video", "note", "solution", "other"),
        allowNull: false
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      fileUrl: {
        type: Sequelize.STRING,
        allowNull: false
      },

      itemId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      programId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      batchId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      downloadedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },

      deviceInfo: {
        type: Sequelize.TEXT,
        allowNull: true
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('downloads');
  }
};
