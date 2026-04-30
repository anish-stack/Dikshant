'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class TestDikshant extends Model {
    static associate(models) {
      // Test belongs to Series
      TestDikshant.belongsTo(models.TestSeriesDikshant, {
        foreignKey: 'series_id',
        as: 'series',
      });

      // Test has many Questions
      TestDikshant.hasMany(models.QuestionDikshant, {
        foreignKey: 'test_id',
        as: 'questions',
        onDelete: 'CASCADE',
      });

      // Test has many Attempts
      TestDikshant.hasMany(models.TestAttemptDikshant, {
        foreignKey: 'test_id',
        as: 'attempts',
        onDelete: 'CASCADE',
      });
    }

    // Instance helpers
    isLive() {
      const now = new Date();
      return (
        this.status === 'live' &&
        this.scheduled_start <= now &&
        this.scheduled_end >= now
      );
    }

    isAccessible() {
      return ['live', 'closed', 'result_published'].includes(this.status);
    }
  }

  TestDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      series_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'test_series_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true },
      },
      model_answer_pdf_url: {
        type: DataTypes.STRING(1000),
        allowNull: true

      },
      test_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      type: {
        type: DataTypes.ENUM('prelims', 'mains'),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'live', 'closed', 'result_published'),
        allowNull: false,
        defaultValue: 'draft',
      },
      scheduled_start: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      scheduled_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 120,
        validate: { min: 10, max: 480 },
      },
      total_marks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 200,
      },
      total_questions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
      },
      negative_marking: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 0.33,
        comment: '0 = no negative marking',
      },
      is_free: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      syllabus_pdf: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      result_published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      attempt_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avg_score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      pass_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      auto_publish_result: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'TestDikshant',
      tableName: 'tests_dikshant',
      paranoid: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deleted_at",
      timestamps: true,
      indexes: [
        { fields: ['series_id'], name: 'idx_tests_series_id' },
        { fields: ['status'], name: 'idx_tests_status' },
        { fields: ['scheduled_start'], name: 'idx_tests_scheduled_start' },
        { fields: ['series_id', 'status'], name: 'idx_tests_series_status' },
      ],
    }
  );

  return TestDikshant;
};
