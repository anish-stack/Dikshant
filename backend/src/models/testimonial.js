'use strict';
module.exports = (sequelize, DataTypes) => {
  const Testimonial = sequelize.define('Testimonial', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: DataTypes.STRING,
    message: DataTypes.TEXT,
    role: DataTypes.STRING,
  }, {
    tableName: 'testimonials',
    timestamps: true
  });


  Testimonial.associate = function (models) {
    // define associations here
  };


  return Testimonial;
};
