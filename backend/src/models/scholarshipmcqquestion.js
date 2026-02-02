'use strict';
module.exports = (sequelize, DataTypes) => {
  const ScholarshipMCQQuestion = sequelize.define('ScholarshipMCQQuestion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    questionType: DataTypes.ENUM('Single', 'Multiple'),
    positiveMarks: DataTypes.FLOAT,
    negativeMark: DataTypes.FLOAT,
    question: DataTypes.TEXT,
    options: DataTypes.JSON,
    correctOption: DataTypes.JSON

  }, {
    tableName: 'scholarshipmcqquestions',
    timestamps: true
  });

  return ScholarshipMCQQuestion;
};
