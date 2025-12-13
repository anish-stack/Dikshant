'use strict';
module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('Program', {
    
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    description: DataTypes.TEXT,

    typeOfCourse: {
      type: DataTypes.ENUM('Offline', 'Online', 'Recorded', 'Live'),
      allowNull: false,
      defaultValue: 'Online'
    },

    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }

  }, {
    tableName: 'programs',
    timestamps: true
  });

  Program.associate = function (models) {
    Program.hasMany(models.Batch, { foreignKey: 'programId', as: 'batches' });
    Program.hasMany(models.VideoCourse, { foreignKey: 'programId', as: 'videoCourses' });
    Program.hasMany(models.PDFNote, { foreignKey: 'programId', as: 'pdfNotes' });
    Program.hasMany(models.TestSeries, { foreignKey: 'programId', as: 'testSeries' });
  };

  return Program;
};
