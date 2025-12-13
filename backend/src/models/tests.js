'use strict';

module.exports = (sequelize, DataTypes) => {
  const Test = sequelize.define('Test', {

    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    displayOrder: DataTypes.INTEGER,

    testSeriesId: DataTypes.INTEGER,

    reattemptAllowed: DataTypes.BOOLEAN,
    type: DataTypes.ENUM("EXERCISE", "LIVE", "NORMAL", "MOCK"),

    resultGenerationTime: DataTypes.DATE,
    isDemo: DataTypes.BOOLEAN,

    duration: DataTypes.INTEGER,
    status: DataTypes.ENUM("active", "inactive"),

    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,

    solutionFileUrl: DataTypes.STRING,

    languages: DataTypes.JSON,

    subjectId: DataTypes.JSON,
    noOfQuestions: DataTypes.JSON,

    passingPercentage: DataTypes.INTEGER

  }, {
    tableName: 'tests',
    timestamps: true
  });

  Test.associate = function (models) {
    Test.belongsTo(models.TestSeries, { foreignKey: "testSeriesId", as: "series" });
  };

  return Test;
};
