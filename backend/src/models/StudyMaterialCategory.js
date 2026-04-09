'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  class StudyMaterialCategory extends Model {
    static associate(models) {

      StudyMaterialCategory.hasMany(models.StudyMaterial, {
        foreignKey: "categoryId",
        as: "materials"
      });

    }
  }

  StudyMaterialCategory.init({

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: "active"
    }

  }, {
    sequelize,
    modelName: 'StudyMaterialCategory',
    tableName: 'study_material_categories',

    timestamps: false   // ⭐ THIS FIX
  });

  return StudyMaterialCategory;
};