module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      name: DataTypes.STRING,

      email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },

      mobile: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },

      password: DataTypes.STRING,

      role: {
        type: DataTypes.ENUM("student", "admin", "instructor"),
        defaultValue: "student",
      },

      otp: DataTypes.STRING,
      otp_expiry: DataTypes.DATE,

      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      state: DataTypes.STRING,
      city: DataTypes.STRING,
      address: DataTypes.STRING,

      fcm_token: DataTypes.STRING,
      fcm_update_at: DataTypes.DATE,

      platform: DataTypes.STRING,
      appVersion: {
        type: DataTypes.STRING,
        field: "app_version",
      },

      device_id: DataTypes.STRING,

      refresh_token: DataTypes.STRING,
      active_token: DataTypes.STRING,

      device_change_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      last_device_change_at: DataTypes.DATE,

      blocked_until: DataTypes.DATE,

      last_login_at: DataTypes.DATE,

      last_login_device: DataTypes.STRING,

      forgetPasswordOtp: DataTypes.STRING,
      timeOfExipreOtp: DataTypes.DATE,

      tempPassword: DataTypes.STRING,
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  User.associate = function (models) {
    User.hasMany(models.DeviceHistory, {
      foreignKey: "user_id",
      as: "devices",
    });
  };

  return User;
};