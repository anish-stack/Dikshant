'use strict';

module.exports = (sequelize, DataTypes) => {
  const TestSeries = sequelize.define(
    'TestSeries',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      imageUrl: DataTypes.STRING,
      title: DataTypes.STRING,
      slug: DataTypes.STRING,
      displayOrder: DataTypes.INTEGER,

      status: {
        type: DataTypes.ENUM('new', 'popular', 'featured'),
      },

      isActive: DataTypes.BOOLEAN,
      description: DataTypes.TEXT,

      testStartDate: DataTypes.DATE,
      testStartTime: DataTypes.DATE,

      // 🔥 EXACT DB COLUMN NAMES
      AnswerSubmitDateAndTime: DataTypes.DATE,
      AnswerLastSubmitDateAndTime: DataTypes.DATE,
      questionPdf: DataTypes.STRING,
      answerkey: DataTypes.STRING,
      timeDurationForTest: DataTypes.INTEGER,
      passing_marks: DataTypes.INTEGER,
      expirSeries: DataTypes.DATE,
      type: DataTypes.STRING,

      price: DataTypes.FLOAT,
      discountPrice: DataTypes.FLOAT,
      gst: DataTypes.FLOAT,
    },
    {
      tableName: 'testseriess', // ✅ EXACT
      timestamps: true,
      underscored: false,       // ✅ MUST
    }
  );

  return TestSeries;
};
