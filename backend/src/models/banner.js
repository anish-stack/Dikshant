'use strict';

module.exports = (sequelize, DataTypes) => {
  const Banner = sequelize.define("Banner", {

    id: { 
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true 
    },

    title: {
      type: DataTypes.STRING,
    },

    imageUrl: {
      type: DataTypes.STRING,
    },

    linkUrl: {
      type: DataTypes.STRING,
    },

    position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },

    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,   // active by default
      allowNull: false
    }

  }, {
    tableName: "banners",
    timestamps: true
  });

  return Banner;
};
