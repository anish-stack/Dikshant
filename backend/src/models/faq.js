'use strict';
module.exports = (sequelize, DataTypes) => {
  const FAQ = sequelize.define('FAQ', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    question: DataTypes.TEXT,
    answer: DataTypes.TEXT,
  }, {
    tableName: 'faqs',
    timestamps: true
  });


  FAQ.associate = function (models) {
    // define associations here
  };


  return FAQ;
};
