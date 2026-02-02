'use strict';

module.exports = (sequelize, DataTypes) => {
  const ScholarshipApplication = sequelize.define('ScholarshipApplication', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    scholarshipId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING(15),
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('Male', 'Female', 'Other'),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    course: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    medium: {
      type: DataTypes.ENUM('Hindi', 'English', 'Bilingual'),
      allowNull: false,
    },
    certificatePath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Path to uploaded certificate (PDF/Image)",
    },
    photoPath: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Path to uploaded candidate photo",
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      defaultValue: 'Pending',
    },
  }, {
    tableName: 'scholarshipapplications',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['scholarshipId'] },
      { fields: ['status'] },
    ],
  });

  ScholarshipApplication.associate = function(models) {
    // Relationship with Scholarship
    ScholarshipApplication.belongsTo(models.Scholarship, {
      foreignKey: 'scholarshipId',
      as: 'scholarship',
    });

    ScholarshipApplication.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'applicant',
    });
  };

  return ScholarshipApplication;
};