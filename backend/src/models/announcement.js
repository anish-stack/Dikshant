'use strict';

module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define('Announcement', {

    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    title: DataTypes.STRING,
    message: DataTypes.TEXT,
    publishDate: DataTypes.DATE

  }, {
    tableName: 'announcements',
    timestamps: true
  });

  return Announcement;
};
