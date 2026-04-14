'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {

  class StudyMaterialDeliveryHistory extends Model {
    static associate(models) {

      StudyMaterialDeliveryHistory.belongsTo(models.StudyMaterialPurchase, {
        foreignKey: "purchaseId",
        as: "purchase"
      });

    }
  }

  StudyMaterialDeliveryHistory.init({

    purchaseId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    status: {
      type: DataTypes.ENUM(
        "confirmed",
        "processing",
        "dispatched",
        "shipped",
        "delivered",
        "cancelled"
      ),
      allowNull: false
    },

    remarks: {
      type: DataTypes.TEXT
    }

  }, {
    sequelize,
    modelName: "StudyMaterialDeliveryHistory",
    tableName: "study_material_delivery_history",
    timestamps: true
  });

  return StudyMaterialDeliveryHistory;

};