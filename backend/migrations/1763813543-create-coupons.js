'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('coupons', {

      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      discount: {
        type: Sequelize.FLOAT,
        allowNull: false
      },

      discountType: {
        type: Sequelize.ENUM("flat", "percentage"),
        allowNull: false
      },

      minPurchase: {
        type: Sequelize.FLOAT,
        allowNull: true
      },

      maxDiscount: {
        type: Sequelize.FLOAT,
        allowNull: true
      },

      validTill: {
        type: Sequelize.DATE,
        allowNull: false
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE

    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('coupons');
  }
};
