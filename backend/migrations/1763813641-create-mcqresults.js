'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mcqresults', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      testSeriesId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      testId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      questionId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      subjectId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      selectedOptions: {
        type: Sequelize.JSON,      // ["A"], ["A","C"], [] (skipped)
        allowNull: false
      },

      correctOptions: {
        type: Sequelize.JSON,      // ["A"], ["B","D"]
        allowNull: false
      },

      isCorrect: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },

      score: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },

      timeTaken: {
        type: Sequelize.INTEGER,   // seconds
        defaultValue: 0
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('mcqresults');
  }
};
