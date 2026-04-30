'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class QuestionDikshant extends Model {
    static associate(models) {
      // Question belongs to Test
      QuestionDikshant.belongsTo(models.TestDikshant, {
        foreignKey: 'test_id',
        as: 'test',
      });

      // Question has many Options
      QuestionDikshant.hasMany(models.QuestionOptionDikshant, {
        foreignKey: 'question_id',
        as: 'options',
        onDelete: 'CASCADE',
      });

      // Question has many AttemptAnswers
      QuestionDikshant.hasMany(models.AttemptAnswerDikshant, {
        foreignKey: 'question_id',
        as: 'answers',
        onDelete: 'CASCADE',
      });
    }
  }

  QuestionDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'tests_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: { notEmpty: true },
      },
      question_image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      subject: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: 'General',
        comment: 'GS1 / GS2 / GS3 / GS4 / CSAT / Environment etc.',
      },
      topic: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      difficulty: {
        type: DataTypes.ENUM('easy', 'medium', 'hard'),
        allowNull: false,
        defaultValue: 'medium',
      },
      correct_option: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: { min: 1, max: 4 },
        comment: '1 to 4 maps to option_number in question_options',
      },
      marks: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 2.0,
      },
      explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Plain text explanation',
      },
      explanation_html: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: 'Rich HTML with why correct + why others wrong',
      },
      source: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Source reference text e.g. NCERT Class 12, Ch 4',
      },
      video_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      article_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      source_link_status: {
        type: DataTypes.ENUM('unchecked', 'valid', 'broken'),
        allowNull: false,
        defaultValue: 'unchecked',
      },
      last_link_check: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '["polity","fundamental rights"]',
      },
      year_asked: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'PYQ year if applicable',
        validate: { min: 1990, max: 2100 },
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'QuestionDikshant',
      tableName: 'questions_dikshant',
      paranoid: false,   // questions not soft-deleted, just deactivated via is_active
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deleted_at",
      timestamps: true,
      indexes: [
        { fields: ['test_id'], name: 'idx_questions_test_id' },
        { fields: ['subject'], name: 'idx_questions_subject' },
        { fields: ['difficulty'], name: 'idx_questions_difficulty' },
        { fields: ['test_id', 'order_index'], name: 'idx_questions_order' },
      ],
    }
  );

  return QuestionDikshant;
};
