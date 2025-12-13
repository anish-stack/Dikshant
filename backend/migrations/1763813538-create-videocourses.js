'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('videocourses', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      videoSource: {
        type: Sequelize.ENUM("youtube", "s3"),
        allowNull: false
      },

      url: {
        type: Sequelize.STRING,
        allowNull: false
      },

      batchId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      isDownloadable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      isDemo: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      status: {
        type: Sequelize.ENUM("active", "inactive"),
        defaultValue: "active"
      },

      programId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'programs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('videocourses');
  }
};
