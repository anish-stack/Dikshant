module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      name: DataTypes.STRING,
      email: { type: DataTypes.STRING, unique: true, allowNull: true },
      mobile: { type: DataTypes.STRING, unique: true, allowNull: true },
      password: DataTypes.STRING,
      role: {
        type: DataTypes.ENUM("student", "admin", "instructor"),
        defaultValue: "student",
      },
      otp: DataTypes.STRING,
      otp_expiry: DataTypes.DATE,
      is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      state: DataTypes.STRING,
      fcm_token: DataTypes.STRING,
      fcm_update_at: DataTypes.DATE,
      device_id: DataTypes.STRING,
      platform: DataTypes.STRING,
      appVersion: { type: DataTypes.STRING, field: 'app_version' },
      refresh_token: DataTypes.STRING,
      city: DataTypes.STRING,
      address: DataTypes.STRING,
    },
    { tableName: "users" }
  );

  User.associate = function (models) {
    // associations can be defined here
  };

  return User;
};
