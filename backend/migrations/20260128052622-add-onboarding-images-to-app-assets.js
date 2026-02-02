"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("app_assets", "onboardingImageOne", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("app_assets", "onboardingImageTwo", {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("app_assets", "onboardingImageOne");
    await queryInterface.removeColumn("app_assets", "onboardingImageTwo");
  },
};
