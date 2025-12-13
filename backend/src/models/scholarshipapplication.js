'use strict';
module.exports = (sequelize, DataTypes) => {
  const ScholarshipApplication = sequelize.define('ScholarshipApplication', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: DataTypes.INTEGER,
    scholarshipId: DataTypes.INTEGER,
    status: DataTypes.STRING,
  },
    {
      tableName: 'scholarshipapplications',
      timestamps: true
    });


  ScholarshipApplication.associate = function (models) {
    ScholarshipApplication.belongsTo(models.Scholarship, { foreignKey: 'scholarshipId', as: 'scholarship' });
  };


  return ScholarshipApplication;
};
