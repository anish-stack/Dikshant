'use strict';
module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define('Subject', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    slug: DataTypes.STRING,
    description: DataTypes.TEXT,
  }, {
    tableName: 'subjects',
    timestamps: true
  });


  Subject.associate = function (models) {
    Subject.hasMany(models.MCQQuestion, { foreignKey: 'subjectId', as: 'mcqQuestions' });
    Subject.belongsToMany(models.Batch, { through: 'batch_subjects' });
    
  };


  return Subject;
};
