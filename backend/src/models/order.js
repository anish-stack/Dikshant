'use strict';

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define("Order", {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: DataTypes.INTEGER,
    type: DataTypes.ENUM("batch", "test", "quiz"),
    itemId: DataTypes.INTEGER,

    amount: DataTypes.FLOAT,
    discount: DataTypes.FLOAT,
    gst: DataTypes.FLOAT,
    totalAmount: DataTypes.FLOAT,

    razorpayOrderId: DataTypes.STRING,
    razorpayPaymentId: DataTypes.STRING,
    razorpaySignature: DataTypes.STRING,
    reason: DataTypes.STRING,
    status: DataTypes.ENUM("pending", "success", "failed"),
    paymentDate: DataTypes.DATE,
    accessValidityDays: DataTypes.INTEGER,
    quiz_limit: DataTypes.INTEGER,
    quiz_attempts_used: DataTypes.INTEGER,
    enrollmentStatus: DataTypes.ENUM("active", "expired", "cancelled"),
    couponId: DataTypes.INTEGER,
    couponCode: DataTypes.STRING,
    couponDiscount: DataTypes.FLOAT,
    couponDiscountType: DataTypes.ENUM("flat", "percentage"),

  }, {
    tableName: "orders",
    timestamps: true
  });

  Order.associate = function (models) {
    Order.belongsTo(models.Batch, {
      foreignKey: 'itemId',
      as: 'batch',
      constraints: false
    });
    Order.belongsTo(models.Quizzes, {
      foreignKey: 'itemId',
      as: 'Quizzes',
      constraints: false
    });
    Order.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return Order;
};