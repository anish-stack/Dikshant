module.exports = (sequelize, DataTypes) => {
  const DeviceHistory = sequelize.define(
    "DeviceHistory",
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      old_device: DataTypes.STRING,

      new_device: DataTypes.STRING,

      platform: DataTypes.STRING,

      appVersion: DataTypes.STRING,

      ip_address: DataTypes.STRING,

      changed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "device_history",
      timestamps: false,
    }
  );

  DeviceHistory.associate = function (models) {
    DeviceHistory.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return DeviceHistory;
};