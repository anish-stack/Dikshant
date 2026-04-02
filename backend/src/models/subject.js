'use strict';

module.exports = (sequelize, DataTypes) => {

  const Subject = sequelize.define('Subject', {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT
    },

    // ⭐ NEW FIELD
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }

  }, {
    tableName: 'subjects',
    timestamps: true
  });


  Subject.associate = function (models) {

    Subject.hasMany(models.MCQQuestion, {
      foreignKey: 'subjectId',
      as: 'mcqQuestions'
    });

    Subject.belongsToMany(models.Batch, {
      through: 'batch_subjects'
    });

  };

  return Subject;
};