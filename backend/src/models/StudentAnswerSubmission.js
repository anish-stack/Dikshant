'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StudentAnswerSubmission extends Model {
    static associate(models) {
      this.belongsTo(models.TestSeries, {
        foreignKey: "testSeriesId",
      });

      this.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }
  }

  StudentAnswerSubmission.init(
    {
      testSeriesId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // ✅ Stored as STRING in DB
      answerSheetUrls: {
        type: DataTypes.TEXT('long'),
        allowNull: false,
        get() {
          const raw = this.getDataValue('answerSheetUrls');
          return raw ? JSON.parse(raw) : [];
        },
        set(value) {
          this.setDataValue(
            'answerSheetUrls',
            JSON.stringify(value || [])
          );
        },
      },

      submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      isLate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      /* ✅ RESULT FIELDS */
      resultGenerated: {
        field: 'result_generated',
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      totalMarks: {
        field: 'total_marks',
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      marksObtained: {
        field: 'marks_obtained',
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      answerCheckedUrl: {
        field: 'answer_checked_url',
        type: DataTypes.STRING,
        allowNull: true,
      },

      checkedAt: {
        field: 'checked_at',
        type: DataTypes.DATE,
        allowNull: true,
      },

      reviewStatus: {
        field: 'review_status',
        type: DataTypes.ENUM(
          'pending',             // Newly submitted
          'under_review',        // Being evaluated
          'reviewed',            // Checked, feedback given (general)
          'approved',            // Everything correct, result ready/published
          'rejected',            // Invalid submission
          'needs_revision',      // Student must fix and resubmit
          'recheck_requested',   // Student disagrees with marks and requests re-evaluation
          'rechecked',           // Re-evaluation completed
          'finalized'            // No further changes possible (locked)
        ),
        defaultValue: 'pending',
        allowNull: false,
      },

      reviewComment: {
        field: 'review_comment',
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'StudentAnswerSubmission',
      tableName: 'StudentAnswerSubmissions',
    }
  );

  return StudentAnswerSubmission;
};
