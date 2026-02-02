'use strict';

module.exports = (sequelize, DataTypes) => {
  const MCQQuestion = sequelize.define('MCQQuestion', {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    questionType: DataTypes.ENUM('Single', 'Multiple'),
    positiveMarks: DataTypes.FLOAT,
    negativeMark: DataTypes.FLOAT,

    question: DataTypes.TEXT,

    subjectId: DataTypes.INTEGER,

    options: DataTypes.JSON,
    correctOption: DataTypes.JSON

  }, {
    tableName: 'mcqquestions',
    timestamps: true
  });

  MCQQuestion.associate = function (models) {
    MCQQuestion.belongsTo(models.Subject, { foreignKey: 'subjectId', as: 'subject' });
  };

  return MCQQuestion;
};
