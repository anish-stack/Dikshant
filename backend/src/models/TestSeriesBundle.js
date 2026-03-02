'use strict';

module.exports = (sequelize, DataTypes) => {
  const TestSeriesBundle = sequelize.define(
    'TestSeriesBundle',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      imageUrl: DataTypes.STRING,
      title: DataTypes.STRING,
      slug: DataTypes.STRING,
      description: DataTypes.TEXT,

      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },

      price: DataTypes.FLOAT,
      discountPrice: DataTypes.FLOAT,
      gst: DataTypes.FLOAT,

      displayOrder: DataTypes.INTEGER,
      expirBundle: DataTypes.DATE,
    },
    {
      tableName: 'testseries_bundles',
      timestamps: true,
      underscored: false,
    }
  );

  TestSeriesBundle.associate = function (models) {
    TestSeriesBundle.belongsToMany(models.TestSeries, {
      through: "testseries_bundle_items",
      as: "testSeries",
      foreignKey: "bundleId",
      otherKey: "testSeriesId",
    });
  };

  return TestSeriesBundle;
};