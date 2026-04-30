'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class AttemptAnswerDikshant extends Model {
    static associate(models) {
      // Answer belongs to Attempt
      AttemptAnswerDikshant.belongsTo(models.TestAttemptDikshant, {
        foreignKey: 'attempt_id',
        as: 'attempt',
      });

      // Answer belongs to Question
      AttemptAnswerDikshant.belongsTo(models.QuestionDikshant, {
        foreignKey: 'question_id',
        as: 'question',
      });
    }
  }

  AttemptAnswerDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      attempt_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'test_attempts_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      question_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'questions_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      selected_option: {
        type: DataTypes.TINYINT,
        allowNull: true,
        validate: { min: 1, max: 4 },
        comment: 'null = question not attempted',
      },
      is_correct: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        comment: 'null until submitted',
      },
      marks_awarded: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: 'Positive for correct, negative for wrong, 0 for unattempted',
      },
      is_marked_review: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Student marked for review flag',
      },
      visit_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'How many times student opened this question',
      },
      time_spent_seconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Cumulative time on this question',
      },
      answered_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last answer save',
      },
    },
    {
      sequelize,
      modelName: 'AttemptAnswerDikshant',
      tableName: 'attempt_answers_dikshant',
      paranoid: false,
         createdAt: "createdAt",
      updatedAt: "updatedAt",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['attempt_id', 'question_id'],
          name: 'uq_answer_attempt_question',
        },
        { fields: ['attempt_id'],   name: 'idx_answers_attempt_id' },
        { fields: ['question_id'],  name: 'idx_answers_question_id' },
      ],
    }
  );

  return AttemptAnswerDikshant;
};
