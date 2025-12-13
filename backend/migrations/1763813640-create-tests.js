'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tests', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false
      },

      slug: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },

      displayOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },

      testSeriesId: {
        type: Sequelize.INTEGER,
        references: {
          model: "testseriess",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },

      reattemptAllowed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      type: {
        type: Sequelize.ENUM("EXERCISE", "LIVE", "NORMAL", "MOCK"),
        defaultValue: "NORMAL"
      },

      resultGenerationTime: {
        type: Sequelize.DATE,
        allowNull: true
      },

      isDemo: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      duration: {
        type: Sequelize.INTEGER, // minutes
        allowNull: false
      },

      status: {
        type: Sequelize.ENUM("active", "inactive"),
        defaultValue: "active"
      },

      startTime: {
        type: Sequelize.DATE,
        allowNull: true
      },

      endTime: {
        type: Sequelize.DATE,
        allowNull: true
      },

      solutionFileUrl: {
        type: Sequelize.STRING,
        allowNull: true
      },

      languages: {
        type: Sequelize.JSON,
        allowNull: true
      },

      // JSON ARRAY
      subjectId: {
        type: Sequelize.JSON,
        allowNull: false
      },

      // JSON ARRAY
      noOfQuestions: {
        type: Sequelize.JSON,
        allowNull: false
      },

      passingPercentage: {
        type: Sequelize.INTEGER,
        defaultValue: 40
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tests');
  }
};
