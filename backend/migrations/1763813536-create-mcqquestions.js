'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('mcqquestions', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      questionType: {
        type: Sequelize.ENUM('Single', 'Multiple'),
        allowNull: false
      },

      positiveMarks: {
        type: Sequelize.FLOAT,
        defaultValue: 1
      },

      negativeMark: {
        type: Sequelize.FLOAT,
        defaultValue: 0
      },

      question: {
        type: Sequelize.TEXT,
        allowNull: false
      },

      subjectId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'subjects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      options: {
        type: Sequelize.JSON, // ["opt1", "opt2", "opt3", "opt4"]
        allowNull: false
      },

      correctOption: {
        type: Sequelize.JSON, 
        allowNull: false
        // Single => ["A"]
        // Multiple => ["A","C"]
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
    await queryInterface.dropTable('mcqquestions');
  }
};
