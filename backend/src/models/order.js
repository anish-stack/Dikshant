'use strict';

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define("Order", {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: DataTypes.INTEGER,
    type: DataTypes.ENUM("batch", "test"),
    itemId: DataTypes.INTEGER,

    amount: DataTypes.FLOAT,
    discount: DataTypes.FLOAT,
    gst: DataTypes.FLOAT,
    totalAmount: DataTypes.FLOAT,

    razorpayOrderId: DataTypes.STRING,
    razorpayPaymentId: DataTypes.STRING,
    razorpaySignature: DataTypes.STRING,

    status: DataTypes.ENUM("pending", "success", "failed"),
    paymentDate: DataTypes.DATE,
    accessValidityDays: DataTypes.INTEGER,
    enrollmentStatus: DataTypes.ENUM("active", "expired", "cancelled"),
    couponId: DataTypes.INTEGER,
    couponCode: DataTypes.STRING,
    couponDiscount: DataTypes.FLOAT,
    couponDiscountType: DataTypes.ENUM("flat", "percentage"),


  }, {
    tableName: "orders",
    timestamps: true
  });

  return Order;
};
