"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class SystemLog extends Model {
    static associate(models) {
      // Optional: link to User for context
      SystemLog.belongsTo(models.User, {
        foreignKey: "userId",
        as: "user",
        constraints: false, // don't enforce FK — logs must survive even if user deleted
      });
    }
  }

  SystemLog.init(
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      level: {
        type: DataTypes.ENUM("info", "warn", "error", "critical"),
        allowNull: false,
        defaultValue: "info",
      },
      context: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: "Which function/module generated this log",
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      reason: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "Extra structured data: batchId, quizIds, itemId, raw error, etc.",
      },
      resolved: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Admin userId who marked this resolved",
      },
    },
    {
      sequelize,
      modelName: "SystemLog",
      tableName: "SystemLogs",
      timestamps: true,
    }
  );

  return SystemLog;
};