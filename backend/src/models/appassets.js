module.exports = (sequelize, DataTypes) => {
  const AppAssets = sequelize.define(
    "AppAssets",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      /* ---------- INTRO VIDEOS ---------- */
      quizVideoIntro: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      testSeriesVideoIntro: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      /* ---------- ONBOARDING ---------- */
      onboardingImageOne: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      onboardingImageTwo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      /* ---------- APP INFO ---------- */
      appName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      appLogo: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      /* ---------- SUPPORT ---------- */
      supportPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      supportEmail: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      supportWhatsappLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      supportAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      /* ---------- SOCIAL LINKS ---------- */
      facebookLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      instagramLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      youtubeLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      telegramLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      twitterLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      linkedinLink: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      /* ---------- MAINTENANCE MODE ---------- */
      isMaintenanceMode: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      maintenanceTitle: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      maintenanceMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      maintenanceStartAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      maintenanceEndAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      /* ---------- GLOBAL ALERT SYSTEM ---------- */
      alert_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      alert_title: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },

      alert_message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      alert_type: {
        type: DataTypes.ENUM("info", "warning", "success", "error"),
        defaultValue: "info",
      },

      alert_display_type: {
        type: DataTypes.ENUM("popup", "banner", "toast"),
        defaultValue: "popup",
      },

      alert_start_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      alert_end_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      alert_is_blocking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: "app_assets",
      timestamps: true,
    }
  );

  return AppAssets;
};
