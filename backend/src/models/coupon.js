'use strict';

module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define("Coupon", {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    code: DataTypes.STRING,
    discount: DataTypes.FLOAT,
    discountType: DataTypes.ENUM("flat", "percentage"),

    minPurchase: DataTypes.FLOAT,
    maxDiscount: DataTypes.FLOAT,

    validTill: DataTypes.DATE,
    isActive: DataTypes.BOOLEAN

  }, {
    tableName: "coupons",
    timestamps: true
  });

  return Coupon;
};
