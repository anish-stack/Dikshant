// ============================================
// 1️⃣ quiz_attempts.js - FIXED with question_order
// ============================================
module.exports = (sequelize, DataTypes) => {
  const QuizAttempts = sequelize.define(
    "QuizAttempts",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      quizId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "quiz_id",
        references: {
          model: "quizzes",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id",
        references: {
          model: "users",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      attemptNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "attempt_number",
      },

      score: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },

      totalMarks: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "total_marks",
      },

      percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },

      rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      timeTaken: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "time_taken",
        comment: "Time taken in seconds",
      },

      status: {
        type: DataTypes.ENUM("in_progress", "completed", "abandoned"),
        defaultValue: "in_progress",
      },

      startedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "started_at",
      },

      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "completed_at",
      },

      // ✅ ADDED: Question order field
      questionOrder: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        field: "question_order",
        get() {
          const val = this.getDataValue("questionOrder");
          if (!val) return [];
          if (typeof val === "string") {
            try {
              return JSON.parse(val);
            } catch (e) {
              return [];
            }
          }
          return Array.isArray(val) ? val : [];
        },
        set(value) {
          this.setDataValue("questionOrder", value);
        },
      },

      // ✅ ADDED: Total marks obtained field
      totalMarksObtained: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
        field: "total_marks_obtained",
      },
    },
    {
      tableName: "quiz_attempts",
      underscored: true,
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ["quiz_id", "user_id", "attempt_number"],
          name: "unique_attempt",
        },
      ],
    }
  );

  QuizAttempts.associate = function (models) {
    QuizAttempts.belongsTo(models.Quizzes, {
      foreignKey: "quizId",
      as: "quiz",
      onDelete: "CASCADE",
    });

    QuizAttempts.belongsTo(models.User, {
      foreignKey: "userId",
      as: "user",
      onDelete: "CASCADE",
    });

    QuizAttempts.hasMany(models.StudentAnswers, {
      foreignKey: "attemptId",
      as: "answers",
      onDelete: "CASCADE",
    });
  };

  return QuizAttempts;
};