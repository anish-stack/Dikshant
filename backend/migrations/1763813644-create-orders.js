'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orders', {

      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      type: {
        type: Sequelize.ENUM("batch", "test"),
        allowNull: false
      },

      itemId: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      amount: Sequelize.FLOAT,
      discount: Sequelize.FLOAT,
      gst: Sequelize.FLOAT,
      totalAmount: Sequelize.FLOAT,

      razorpayOrderId: Sequelize.STRING,
      razorpayPaymentId: Sequelize.STRING,
      razorpaySignature: Sequelize.STRING,

      status: {
        type: Sequelize.ENUM("pending", "success", "failed"),
        defaultValue: "pending"
      },

      paymentDate: Sequelize.DATE,
      accessValidityDays: Sequelize.INTEGER,
      enrollmentStatus: {
        type: Sequelize.ENUM("active", "expired", "cancelled"),
        defaultValue: "active"
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orders');
  }
};
