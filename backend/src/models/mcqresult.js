'use strict';

module.exports = (sequelize, DataTypes) => {
  const MCQResult = sequelize.define('MCQResult', {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: DataTypes.INTEGER,
    testSeriesId: DataTypes.INTEGER,
    testId: DataTypes.INTEGER,
    questionId: DataTypes.INTEGER,
    subjectId: DataTypes.INTEGER,

    selectedOptions: DataTypes.JSON,
    correctOptions: DataTypes.JSON,

    isCorrect: DataTypes.BOOLEAN,
    score: DataTypes.FLOAT,
    timeTaken: DataTypes.INTEGER

  }, {
    tableName: 'mcqresults',
    timestamps: true
  });

  MCQResult.associate = function (models) {
    MCQResult.belongsTo(models.MCQQuestion, { foreignKey: 'questionId', as: 'question' });
    MCQResult.belongsTo(models.Test, { foreignKey: 'testId', as: 'test' });
    MCQResult.belongsTo(models.TestSeries, { foreignKey: 'testSeriesId', as: 'series' });
    MCQResult.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return MCQResult;
};
