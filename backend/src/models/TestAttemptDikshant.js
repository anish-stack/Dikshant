'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class TestAttemptDikshant extends Model {
    static associate(models) {
      TestAttemptDikshant.belongsTo(models.TestDikshant, {
        foreignKey: 'test_id',
        as: 'test',
      });

      TestAttemptDikshant.hasMany(models.AttemptAnswerDikshant, {
        foreignKey: 'attempt_id',
        as: 'answers',
        onDelete: 'CASCADE',
      });
    }

    getRemainingSeconds() {
      if (this.status !== 'in_progress') return 0;
      const durationMs = this.test ? this.test.duration_minutes * 60 * 1000 : 0;
      const elapsed = Date.now() - new Date(this.started_at).getTime();
      return Math.max(0, Math.floor((durationMs - elapsed) / 1000));
    }

    isTimedOut() {
      if (!this.test) return false;
      const durationMs = this.test.duration_minutes * 60 * 1000;
      const elapsed = Date.now() - new Date(this.started_at).getTime();
      return elapsed >= durationMs;
    }
  }

  TestAttemptDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        comment: 'FK to users table',
      },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'tests_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_active_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Updated on each autosave — used for resume detection',
      },
      time_spent_seconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('in_progress', 'submitted', 'timed_out'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Calculated after submission',
      },
      correct_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      wrong_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unattempted_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Set by rank calculation job after test closes',
      },
      percentile: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      subject_scores: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '{"GS1": 45, "CSAT": 30} per subject breakdown',
      },
      resume_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'How many times student reconnected after disconnect',
      },
      ip_address: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      tab_switch_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Anti-cheat: incremented each time student leaves tab',
      },
      is_disqualified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      disqualify_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'TestAttemptDikshant',
      tableName: 'test_attempts_dikshant',
      paranoid: false,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      timestamps: true,
      indexes: [
        // Performance indexes only — NO unique constraints
        // Multiple attempts per user per test is intentional
        { fields: ['user_id'],            name: 'idx_attempts_user_id' },
        { fields: ['test_id'],            name: 'idx_attempts_test_id' },
        { fields: ['status'],             name: 'idx_attempts_status' },
        { fields: ['test_id', 'status'],  name: 'idx_attempts_test_status' },
        { fields: ['test_id', 'score'],   name: 'idx_attempts_score' },
        // Useful for "find active attempt for user" query
        { fields: ['user_id', 'test_id', 'status'], name: 'idx_attempts_user_test_status' },
      ],
    }
  );

  return TestAttemptDikshant;
};