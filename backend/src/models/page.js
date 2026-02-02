'use strict';
module.exports = (sequelize, DataTypes) => {
  const Page = sequelize.define('Page', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    title: DataTypes.STRING,
    slug: DataTypes.STRING,
    content: DataTypes.TEXT,
  }, {
    tableName: 'pages',
    timestamps: true
  });


  Page.associate = function (models) {
    // define associations here
  };


  return Page;
};
