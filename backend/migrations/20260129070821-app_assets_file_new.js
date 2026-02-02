'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('app_assets', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      /* ---------- INTRO VIDEOS ---------- */
      quizVideoIntro: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      testSeriesVideoIntro: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      /* ---------- ONBOARDING IMAGES ---------- */
      onboardingImageOne: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      onboardingImageTwo: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      /* ---------- APP BRANDING ---------- */
      appLogo: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      appName: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      /* ---------- CONTACT & SUPPORT ---------- */
      supportPhone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },

      supportEmail: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      supportWhatsappLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      supportAddress: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      /* ---------- SOCIAL LINKS ---------- */
      facebookLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      instagramLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      youtubeLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      telegramLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      twitterLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      linkedinLink: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      /* ---------- APP MAINTENANCE ---------- */
      isMaintenanceMode: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      maintenanceTitle: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      maintenanceMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      maintenanceStartAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      maintenanceEndAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      /* ---------- TIMESTAMPS ---------- */
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('app_assets');
  },
};
