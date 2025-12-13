'use strict';

module.exports = (sequelize, DataTypes) => {
  const Blog = sequelize.define("Blog", {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    title: DataTypes.STRING,
    imageUrl: DataTypes.STRING,
    slug: DataTypes.STRING,
    content: DataTypes.TEXT

  }, {
    tableName: "blogs",
    timestamps: true
  });

  return Blog;
};
