module.exports = (sequelize, DataTypes) => {
  const StudentAnswers = sequelize.define(
    "StudentAnswers",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      attemptId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "attempt_id",
        references: {
          model: "quiz_attempts",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "question_id",
        references: {
          model: "quiz_questions",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      selectedOptionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "selected_option_id",
        references: {
          model: "quiz_question_options", // ✅ Correct table name
          key: "id",
        },
        onDelete: "SET NULL",
      },

      isCorrect: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: "is_correct",
      },

      marksObtained: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
        field: "marks_obtained",
      },

      timeTaken: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "time_taken",
        comment: "Time taken for this question in seconds",
      },

      answeredAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "answered_at",
      },
    },
    {
      tableName: "student_answers",
      underscored: true,
      timestamps: false,
    }
  );

  StudentAnswers.associate = function (models) {
    StudentAnswers.belongsTo(models.QuizAttempts, {
      foreignKey: "attemptId",
      as: "attempt",
      onDelete: "CASCADE",
    });

    StudentAnswers.belongsTo(models.QuizQuestionOptions, {
      foreignKey: "selectedOptionId",
      as: "selectedOption",
      onDelete: "SET NULL",
    });

    StudentAnswers.belongsTo(models.QuizQuestions, {
      foreignKey: "questionId",
      as: "question",
      onDelete: "CASCADE",
    });
  };

  return StudentAnswers;
};