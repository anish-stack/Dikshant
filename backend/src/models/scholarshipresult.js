"use strict";

module.exports = (sequelize, DataTypes) => {
  const ScholarshipResult = sequelize.define("ScholarshipResult", {

    userId: DataTypes.INTEGER,
    scholarshipId: DataTypes.INTEGER,

    totalQuestions: DataTypes.INTEGER,
    correct: DataTypes.INTEGER,
    wrong: DataTypes.INTEGER,
    skipped: DataTypes.INTEGER,

    positiveMarks: DataTypes.FLOAT,
    negativeMarks: DataTypes.FLOAT,
    totalScore: DataTypes.FLOAT,
    accuracy: DataTypes.FLOAT,
    timeTaken: DataTypes.INTEGER,

    answers: DataTypes.JSON // detailed question result array

  }, {
    tableName: "scholarshipresults",
    timestamps: true
  });

  return ScholarshipResult;
};
