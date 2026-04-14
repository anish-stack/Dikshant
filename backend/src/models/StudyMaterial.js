'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  class StudyMaterial extends Model {
    static associate(models) {

      StudyMaterial.belongsTo(models.StudyMaterialCategory, {
        foreignKey: "categoryId",
        as: "category"
      });

      StudyMaterial.hasMany(models.StudyMaterialPurchase, {
        foreignKey: "materialId",
        as: "purchases"
      });

    }
  }

  StudyMaterial.init({

    title: {
      type: DataTypes.STRING,
      allowNull: false
    },

    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },

    shortDescription: {
      type: DataTypes.TEXT
    },

    description: {
      type: DataTypes.TEXT
    },

    fileUrl: {
      type: DataTypes.TEXT
    },

    samplePdf: {
      type: DataTypes.TEXT
    },

    coverImage: {
      type: DataTypes.TEXT
    },

    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    isHardCopy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isDownloadable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },

    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      defaultValue: 'active'
    }

  }, {
    sequelize,
    modelName: 'StudyMaterial',
    tableName: 'study_materials',
    timestamps: true
  });

  return StudyMaterial;
};