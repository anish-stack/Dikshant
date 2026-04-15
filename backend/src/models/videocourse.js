'use strict';

module.exports = (sequelize, DataTypes) => {
  const VideoCourse = sequelize.define('VideoCourse', {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    imageUrl: DataTypes.STRING,
    title: DataTypes.STRING,

    videoSource: DataTypes.ENUM("youtube", "s3"),
    url: DataTypes.STRING,

    batchId: DataTypes.INTEGER,
    subjectId: DataTypes.INTEGER,

    isDownloadable: DataTypes.BOOLEAN,
    isDemo: DataTypes.BOOLEAN,

    status: DataTypes.ENUM("active", "inactive"),

    isLive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },

    isLiveEnded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    LiveEndAt: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    DateOfLive: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    TimeOfLIve: {
      type: DataTypes.TIME,
      allowNull: true
    },

    secureToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    dateOfClass: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    TimeOfClass: {
      type: DataTypes.TIME,
      allowNull: true
    },

    /* -----------------------------
       Soft Delete Extra Fields
    ------------------------------*/

    deletedById: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    statusDelete: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },


  }, {
    tableName: 'videocourses',
    timestamps: true,

    // Enables soft delete
    paranoid: true,

    // Sequelize will automatically manage this column
    deletedAt: 'deletedAt'
  });

  return VideoCourse;
};