module.exports = (sequelize, DataTypes) => {
  const QuizQuestionOptions = sequelize.define(
    "QuizQuestionOptions",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      questionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "question_id", // ✅ FIX
        references: {
          model: "quiz_questions",
          key: "id",
        },
        onDelete: "CASCADE",
      },
option_text: {  // ← snake_case
        type: DataTypes.TEXT,
        allowNull: false,
      },

      optionImage: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "option_image", // ✅ FIX
      },

     is_correct: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        // field: "is_correct", // ✅ FIX
      },

      order_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
      
      },
    },
    {
      tableName: "options",
      underscored: true,
      timestamps: true,
    }
  );

  QuizQuestionOptions.associate = function (models) {
    QuizQuestionOptions.belongsTo(models.QuizQuestions, {
      foreignKey: "questionId",
      as: "question",
      onDelete: "CASCADE",
    });
  };

  return QuizQuestionOptions;
};
