'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class MainsAnswerSubmissionDikshant extends Model {
    static associate(models) {
      // Belongs to User
      MainsAnswerSubmissionDikshant.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Belongs to Test
      MainsAnswerSubmissionDikshant.belongsTo(models.TestDikshant, {
        foreignKey: 'test_id',
        as: 'test'
      });

      // Belongs to Paper
      MainsAnswerSubmissionDikshant.belongsTo(models.MainsTestPaperDikshant, {
        foreignKey: 'paper_id',
        as: 'paper'
      });
    }
  }

  MainsAnswerSubmissionDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true
      },

      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false
      },

      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false
      },

      paper_id: {
        type: DataTypes.CHAR(36),
        allowNull: false
      },

      /* ===============================
         STUDENT SUBMISSION
      =============================== */
      answer_pdf_url: {
        type: DataTypes.STRING(500),
        allowNull: false
      },

      submitted_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },

      /* ===============================
         ADMIN EVALUATION
      =============================== */
      evaluated_pdf_url: {
        type: DataTypes.STRING(500),
        allowNull: true
      },

      marks_obtained: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
      },

      total_marks: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      feedback: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      checked_by: {
        type: DataTypes.CHAR(36),
        allowNull: true
      },

      checked_at: {
        type: DataTypes.DATE,
        allowNull: true
      },

      /* ===============================
         STATUS FLOW
      =============================== */
      status: {
        type: DataTypes.ENUM(
          'submitted',
          'under_review',
          'checked',
          'rejected'
        ),
        defaultValue: 'submitted'
      },

      result_status: {
        type: DataTypes.ENUM('pending', 'pass', 'fail'),
        defaultValue: 'pending'
      }
    },
    {
      sequelize,
      modelName: 'MainsAnswerSubmissionDikshant',
      tableName: 'mains_answer_submissions_dikshant',

      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',

      indexes: [
        { fields: ['user_id'], name: 'idx_mains_user' },
        { fields: ['paper_id'], name: 'idx_mains_paper' },
        { fields: ['status'], name: 'idx_mains_status' }
      ]
    }
  );

  return MainsAnswerSubmissionDikshant;
};