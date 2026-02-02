'use strict';
module.exports = (sequelize, DataTypes) => {
  const Scholarship = sequelize.define(
    'Scholarship',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      description: {
        type: DataTypes.TEXT
      },

      // 🔥 Scholarship Status
      applyStatus: {
        type: DataTypes.ENUM('OPEN', 'CLOSED', 'UPCOMING'),
        defaultValue: 'UPCOMING'
      },

      category: {
       type: DataTypes.JSON,
        allowNull: true
      },

      offeredCourseIds: {
        type: DataTypes.JSON,
        allowNull: true
      },

      discountPercentage: {
        type: DataTypes.INTEGER,
        defaultValue: 100
      },

      noOfQuestions: {
        type: DataTypes.INTEGER
      },

      duration: {
        type: DataTypes.INTEGER 
      }
    },
    {
      tableName: 'scholarships',
      timestamps: true
    }
  );

  Scholarship.associate = function (models) {
    Scholarship.hasMany(models.ScholarshipApplication, {
      foreignKey: 'scholarshipId',
      as: 'applications'
    });

    Scholarship.hasMany(models.ScholarshipResult, {
      foreignKey: 'scholarshipId',
      as: 'results'
    });
  };

  return Scholarship;
};
