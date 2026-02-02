module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "fcm_token", { type: Sequelize.STRING });
    await queryInterface.addColumn("users", "fcm_update_at", { type: Sequelize.DATE });
    await queryInterface.addColumn("users", "device_id", { type: Sequelize.STRING });
    await queryInterface.addColumn("users", "platform", { type: Sequelize.STRING });
    await queryInterface.addColumn("users", "app_version", { type: Sequelize.STRING });
    await queryInterface.addColumn("users", "refresh_token", { type: Sequelize.STRING });

    // Add unique constraints
    await queryInterface.addConstraint("users", {
      fields: ["email"],
      type: "unique",
      name: "unique_email"
    });
    await queryInterface.addConstraint("users", {
      fields: ["mobile"],
      type: "unique",
      name: "unique_mobile"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("users", "fcm_token");
    await queryInterface.removeColumn("users", "fcm_update_at");
    await queryInterface.removeColumn("users", "device_id");
    await queryInterface.removeColumn("users", "platform");
    await queryInterface.removeColumn("users", "app_version");
    await queryInterface.removeColumn("users", "refresh_token");

    await queryInterface.removeConstraint("users", "unique_email");
    await queryInterface.removeConstraint("users", "unique_mobile");
  },
};
