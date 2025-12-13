module.exports = (sequelize, DataTypes) => {
  const AppSetting = sequelize.define(
    "AppSetting",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      // 🔧 App Meta
      appName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "My App",
      },

      appVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 🛠 Maintenance
      maintenanceMode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      maintenanceMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // 🚀 Feature Flags
      enableQuiz: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      enableTestSeries: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      enableScholarship: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      enableOffers: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      // 🔔 Notifications
      pushNotificationsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      // 🌍 App Links
      playStoreUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },

        webSiteUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      appStoreUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      privacyPolicyUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      termsUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 📞 Support
      supportEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      supportPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      supportWhatsapp: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // 💳 Payments
      paymentsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      /* ===============================
         🔄 ANDROID UPDATE CONTROL
      =============================== */

      androidMinVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      androidLatestVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      androidForceUpdate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      androidUpdateMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /* ===============================
         🍎 iOS UPDATE CONTROL
      =============================== */

      iosMinVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      iosLatestVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      iosForceUpdate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      iosUpdateMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /* ===============================
         🔥 GLOBAL FORCE UPDATE
      =============================== */

      forceUpdatePlatform: {
        type: DataTypes.ENUM("android", "ios", "both", "none"),
        defaultValue: "none",
      },

      forceUpdate: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      updateMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /* ===============================
         🧩 EXTRA CONFIG (FUTURE SAFE)
      =============================== */

      extra: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "appsettings",
    timestamps: false,
      underscored: true,
    }
  );

  return AppSetting;
};
