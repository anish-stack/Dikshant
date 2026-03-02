'use strict';

module.exports = (sequelize, DataTypes) => {
  const QuizesBundle = sequelize.define(
    'QuizesBundle',
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
      tableName: 'Quizes_bundles',
      timestamps: true,
      underscored: false,
    }
  );

  QuizesBundle.associate = function (models) {
    QuizesBundle.belongsToMany(models.Quizzes, {
      through: "Quizes_bundle_items",
      as: "quizzes",
      foreignKey: "bundle_id",
      otherKey: "quiz_id",
    });
  };

  return QuizesBundle;
};