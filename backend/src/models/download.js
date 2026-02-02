'use strict';

module.exports = (sequelize, DataTypes) => {
  const Download = sequelize.define("Download", {

    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    userId: DataTypes.INTEGER,
    type: DataTypes.ENUM("pdf", "video", "note", "solution", "other"),
    title: DataTypes.STRING,
    fileUrl: DataTypes.STRING,
    itemId: DataTypes.INTEGER,
    programId: DataTypes.INTEGER,
    batchId: DataTypes.INTEGER,
    subjectId: DataTypes.INTEGER,
    downloadedAt: DataTypes.DATE,
    deviceInfo: DataTypes.TEXT

  }, {
    tableName: "downloads",
    timestamps: true
  });

  return Download;
};
