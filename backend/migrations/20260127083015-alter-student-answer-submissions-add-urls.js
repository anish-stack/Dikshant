module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      'StudentAnswerSubmissions',
      'answerKeyUrl'
    );

    await queryInterface.addColumn(
      'StudentAnswerSubmissions',
      'answerSheetUrls',
      {
        type: Sequelize.JSON,
        allowNull: false,
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(
      'StudentAnswerSubmissions',
      'answerSheetUrls'
    );

    await queryInterface.addColumn(
      'StudentAnswerSubmissions',
      'answerKeyUrl',
      {
        type: Sequelize.STRING,
        allowNull: false,
      }
    );
  },
};
