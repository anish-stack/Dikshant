'use strict';

// ============================================================
// DIKSHANT IAS — Phase 3: Mains Evaluation Models
// EvaluatorDikshant | MainsSubmissionDikshant | EvaluationDikshant
// ============================================================

const { Model, DataTypes, UUIDV4 } = require('sequelize');


// ─────────────────────────────────────────────────────────────
// 1. EVALUATOR
// ─────────────────────────────────────────────────────────────
class EvaluatorDikshant extends Model {
  static associate(models) {
    // Evaluator has many Evaluations
    EvaluatorDikshant.hasMany(models.EvaluationDikshant, {
      foreignKey: 'evaluator_id',
      as: 'evaluations',
    });
    // Evaluator has many MainsSubmissions (assigned to them)
    EvaluatorDikshant.hasMany(models.MainsSubmissionDikshant, {
      foreignKey: 'evaluator_id',
      as: 'assigned_submissions',
    });
  }

  canTakeMore() {
    return this.is_active && this.current_pending_count < this.max_daily_load;
  }
}

const EvaluatorModel = (sequelize) => {
  EvaluatorDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      specialization: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '["GS1","GS2","Essay"]',
      },
      max_daily_load: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
        validate: { min: 1, max: 200 },
      },
      sla_hours: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 72,
      },
      current_pending_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_evaluated: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      avg_turnaround_hours: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      avg_marks_given: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: { min: 1.0, max: 5.0 },
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      joined_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EvaluatorDikshant',
      tableName: 'evaluators_dikshant',
      paranoid: true,
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['user_id'], name: 'uq_evaluator_user_id' },
        { fields: ['is_active'],             name: 'idx_evaluator_active' },
      ],
    }
  );
  return EvaluatorDikshant;
};


// ─────────────────────────────────────────────────────────────
// 2. MAINS SUBMISSION
// ─────────────────────────────────────────────────────────────
class MainsSubmissionDikshant extends Model {
  static associate(models) {
    MainsSubmissionDikshant.belongsTo(models.TestAttemptDikshant, {
      foreignKey: 'attempt_id',
      as: 'attempt',
    });
    MainsSubmissionDikshant.belongsTo(models.TestDikshant, {
      foreignKey: 'test_id',
      as: 'test',
    });
    MainsSubmissionDikshant.belongsTo(models.QuestionDikshant, {
      foreignKey: 'question_id',
      as: 'question',
    });
    MainsSubmissionDikshant.belongsTo(models.EvaluatorDikshant, {
      foreignKey: 'evaluator_id',
      as: 'evaluator',
    });
    MainsSubmissionDikshant.hasOne(models.EvaluationDikshant, {
      foreignKey: 'submission_id',
      as: 'evaluation',
      onDelete: 'CASCADE',
    });
  }
}

const MainsSubmissionModel = (sequelize) => {
  MainsSubmissionDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      attempt_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'test_attempts_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'tests_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      question_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'questions_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      answer_text: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      answer_html: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
      },
      pdf_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      word_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      char_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      submitted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_late_submission: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      draft_autosaved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('draft','submitted','assigned','under_evaluation','evaluated','published'),
        allowNull: false,
        defaultValue: 'draft',
      },
      evaluator_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: { model: 'evaluators_dikshant', key: 'id' },
        onDelete: 'SET NULL',
      },
      assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      plagiarism_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'MainsSubmissionDikshant',
      tableName: 'mains_submissions_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['attempt_id', 'question_id'], name: 'uq_submission_attempt_question' },
        { fields: ['attempt_id'],    name: 'idx_submission_attempt_id' },
        { fields: ['test_id'],       name: 'idx_submission_test_id' },
        { fields: ['user_id'],       name: 'idx_submission_user_id' },
        { fields: ['evaluator_id'],  name: 'idx_submission_evaluator_id' },
        { fields: ['status'],        name: 'idx_submission_status' },
      ],
    }
  );
  return MainsSubmissionDikshant;
};


// ─────────────────────────────────────────────────────────────
// 3. EVALUATION
// ─────────────────────────────────────────────────────────────
class EvaluationDikshant extends Model {
  static associate(models) {
    EvaluationDikshant.belongsTo(models.MainsSubmissionDikshant, {
      foreignKey: 'submission_id',
      as: 'submission',
    });
    EvaluationDikshant.belongsTo(models.EvaluatorDikshant, {
      foreignKey: 'evaluator_id',
      as: 'evaluator',
    });
    EvaluationDikshant.belongsTo(models.TestDikshant, {
      foreignKey: 'test_id',
      as: 'test',
    });
  }
}

const EvaluationModel = (sequelize) => {
  EvaluationDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      submission_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: true,
        references: { model: 'mains_submissions_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      evaluator_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'evaluators_dikshant', key: 'id' },
        onDelete: 'RESTRICT',
      },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'tests_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      marks_awarded: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      max_marks: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      inline_comments: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '[{para_index, comment, type: positive|negative|neutral}]',
      },
      criteria_scores: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '[{criterion, max, awarded}]',
      },
      overall_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      strengths: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      improvements: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      checked_pdf_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      assigned_at: { type: DataTypes.DATE, allowNull: true },
      started_at:  { type: DataTypes.DATE, allowNull: true },
      completed_at:{ type: DataTypes.DATE, allowNull: true },
      published_at:{ type: DataTypes.DATE, allowNull: true },
      is_published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      admin_reviewed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      admin_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      student_rating: {
        type: DataTypes.TINYINT,
        allowNull: true,
        validate: { min: 1, max: 5 },
      },
      student_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      revision_requested: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'EvaluationDikshant',
      tableName: 'evaluations_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['submission_id'],   name: 'uq_evaluation_submission' },
        { fields: ['evaluator_id'],                  name: 'idx_evaluation_evaluator_id' },
        { fields: ['test_id'],                       name: 'idx_evaluation_test_id' },
        { fields: ['user_id'],                       name: 'idx_evaluation_user_id' },
        { fields: ['status'],                        name: 'idx_evaluation_status' },
        { fields: ['is_published'],                  name: 'idx_evaluation_published' },
      ],
    }
  );
  return EvaluationDikshant;
};


module.exports = { EvaluatorModel, MainsSubmissionModel, EvaluationModel };
