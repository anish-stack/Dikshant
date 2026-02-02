'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("orders", "couponId", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn("orders", "couponCode", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("orders", "couponDiscount", {
      type: Sequelize.FLOAT,
      allowNull: true
    });

    await queryInterface.addColumn("orders", "couponDiscountType", {
      type: Sequelize.ENUM("flat", "percentage"),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("orders", "couponId");
    await queryInterface.removeColumn("orders", "couponCode");
    await queryInterface.removeColumn("orders", "couponDiscount");
    await queryInterface.removeColumn("orders", "couponDiscountType");
  }
};
