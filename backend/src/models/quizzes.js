module.exports = (sequelize, DataTypes) => {
  const Quizzes = sequelize.define(
    "Quizzes",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      displayIn: {
        type: DataTypes.ENUM("Quiz", "TestSeries"),
        default: "Quiz",
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      totalQuestions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "total_questions",
      },
      timePerQuestion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "time_per_question",
      },
      durationMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "duration_minutes",
      },
      totalMarks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "total_marks",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_active",
      },
      negativeMarking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "negative_marking",
      },
      negativeMarksPerQuestion: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: "negative_marks_per_question",
      },
      passingMarks: {
        type: DataTypes.FLOAT,
        allowNull: false,
        field: "passing_marks",
      },
      isFree: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: "is_free",
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      attemptLimit: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "attempt_limit",
      },
      status: {
        type: DataTypes.ENUM("draft", "published", "archived"),
        defaultValue: "draft",
      },
      showHints: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "show_hints",
      },
      showExplanations: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "show_explanations",
      },
      shuffleQuestions: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "shuffle_questions",
      },
      shuffleOptions: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: "shuffle_options",
      },
    },
    {
      tableName: "quizzes",
      underscored: true,
      timestamps: true,
    }
  );

  // ✅ FIXED: Added associations
  Quizzes.associate = function (models) {
    Quizzes.hasMany(models.QuizQuestions, {
      foreignKey: "quiz_id",
      as: "questions",
      onDelete: "CASCADE",
    });

    Quizzes.hasMany(models.QuizAttempts, {
      foreignKey: "quizId",
      as: "attempts",
      onDelete: "CASCADE",
    });

    Quizzes.hasMany(models.QuizPayments, {
      foreignKey: "quizId",
      as: "payments",
      onDelete: "CASCADE",
    });
  };

  return Quizzes;
};