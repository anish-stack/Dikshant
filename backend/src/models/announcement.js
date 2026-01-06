  'use strict';

  module.exports = (sequelize, DataTypes) => {
    const Announcement = sequelize.define('Announcement', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: DataTypes.STRING,
      message: DataTypes.TEXT,
      publishDate: DataTypes.DATE,
  description: DataTypes.TEXT

    }, {
      tableName: 'announcements',
      timestamps: true
    });

    return Announcement;
  };
