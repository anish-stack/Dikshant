module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "result_generated",
      { type: Sequelize.BOOLEAN, defaultValue: false }
    );

    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "total_marks",
      { type: Sequelize.FLOAT, allowNull: true }
    );

    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "marks_obtained",
      { type: Sequelize.FLOAT, allowNull: true }
    );

    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "answer_checked_url",
      { type: Sequelize.STRING, allowNull: true }
    );

    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "checked_at",
      { type: Sequelize.DATE, allowNull: true }
    );

    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "review_status",
      {
        type: Sequelize.ENUM(
          "pending",
          "reviewed",
          "recheck_requested"
        ),
        defaultValue: "pending",
      }
    );

    await queryInterface.addColumn(
      "StudentAnswerSubmissions",
      "review_comment",
      { type: Sequelize.TEXT, allowNull: true }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("StudentAnswerSubmissions", "result_generated");
    await queryInterface.removeColumn("StudentAnswerSubmissions", "total_marks");
    await queryInterface.removeColumn("StudentAnswerSubmissions", "marks_obtained");
    await queryInterface.removeColumn("StudentAnswerSubmissions", "answer_checked_url");
    await queryInterface.removeColumn("StudentAnswerSubmissions", "checked_at");
    await queryInterface.removeColumn("StudentAnswerSubmissions", "review_status");
    await queryInterface.removeColumn("StudentAnswerSubmissions", "review_comment");
  },
};
