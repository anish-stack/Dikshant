'use strict';

module.exports = (sequelize, DataTypes) => {
  const TestSeries = sequelize.define('TestSeries', {

    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    imageUrl: DataTypes.STRING,
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    displayOrder: DataTypes.INTEGER,
    status: DataTypes.ENUM("new", "popular", "featured"),
    isActive: DataTypes.BOOLEAN,
    description: DataTypes.TEXT,
    price: DataTypes.FLOAT,
    discountPrice: DataTypes.FLOAT,
    gst: DataTypes.FLOAT,
  }, {
    tableName: 'testseriess',
    timestamps: true
  });


  return TestSeries;
};
