'use strict';
module.exports = (sequelize, DataTypes) => {
  const Scholarship = sequelize.define('Scholarship', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    noOfQuestions: DataTypes.INTEGER,
    duration: DataTypes.INTEGER
  }, {
    tableName: 'scholarships',
    timestamps: true
  });



  Scholarship.associate = function (models) {
    Scholarship.hasMany(models.ScholarshipApplication, { foreignKey: 'scholarshipId', as: 'applications' });
    Scholarship.hasMany(models.ScholarshipResult, { foreignKey: 'scholarshipId', as: 'results' });
  };


  return Scholarship;
};
