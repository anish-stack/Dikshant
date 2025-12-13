'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('scholarshipresults', {

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

      scholarshipId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'scholarships',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      // SUMMARY DATA
      totalQuestions: Sequelize.INTEGER,
      correct: Sequelize.INTEGER,
      wrong: Sequelize.INTEGER,
      skipped: Sequelize.INTEGER,

      positiveMarks: Sequelize.FLOAT,
      negativeMarks: Sequelize.FLOAT,
      totalScore: Sequelize.FLOAT,
      accuracy: Sequelize.FLOAT,
      timeTaken: Sequelize.INTEGER,

      // ALL QUESTION-WISE RESULTS IN ONE JSON
      answers: {
        type: Sequelize.JSON,   // Array of objects
        allowNull: false
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('scholarshipresults');
  }
};
