'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('StudentAnswerSubmissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      testSeriesId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'TestSeries',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users', 
          key: 'id'
        }
      },
      answerKeyUrl: {
        type: Sequelize.STRING,
        allowNull: false
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      isLate: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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

    // Unique constraint: one submission per user per test series
    await queryInterface.addIndex('StudentAnswerSubmissions', ['testSeriesId', 'userId'], {
      unique: true,
      name: 'unique_submission_per_user_test'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('StudentAnswerSubmissions');
  }
};