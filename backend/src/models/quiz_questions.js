// models/QuizQuestions.js
module.exports = (sequelize, DataTypes) => {
  const QuizQuestions = sequelize.define(
    "QuizQuestions",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      quiz_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "quizzes",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      question_text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      is_question_have_image: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      question_image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      question_type: {
        type: DataTypes.ENUM(
          "text",
          "image",
          "both",
          "multiple_choice",
          "true_false",
          "short_answer"
        ),
        defaultValue: "multiple_choice",
      },
      explanation: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hint: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      marks: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      time_limit: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      order_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "quiz_questions",
      underscored: true,
      timestamps: true,
    }
  );

  // ADD THIS ASSOCIATION
  QuizQuestions.associate = function (models) {
    QuizQuestions.belongsTo(models.Quizzes, {
      foreignKey: "quiz_id",
      as: "quiz",
    });

    QuizQuestions.hasMany(models.QuizQuestionOptions, {
      foreignKey: "question_id",  // This matches the column name in DB
      as: "options",             // This alias must match what you use in include
      onDelete: "CASCADE",
    });
  };

  return QuizQuestions;
};