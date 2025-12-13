module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("users", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: Sequelize.STRING,
      email: Sequelize.STRING,
      mobile: Sequelize.STRING,
      password: Sequelize.STRING,
      role: { type: Sequelize.ENUM("student", "instructor", "admin"), defaultValue: "student" },
      otp: Sequelize.STRING,
      otp_expiry: Sequelize.DATE,
      is_verified: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      state:Sequelize.STRING,
      city:Sequelize.STRING,
      address:Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("users");
  }
};
