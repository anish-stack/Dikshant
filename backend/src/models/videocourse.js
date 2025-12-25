'use strict';

module.exports = (sequelize, DataTypes) => {
  const VideoCourse = sequelize.define('VideoCourse', {

    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
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
    isLiveEnded:{
  type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    LiveEndAt:{ type: DataTypes.DATEONLY, allowNull:true},
    DateOfLive: {
      type: DataTypes.DATEONLY,    
      allowNull: true           
    },

    TimeOfLIve: {
      type: DataTypes.TIME,     
      allowNull: true       
    },

  }, {
    tableName: 'videocourses',
    timestamps: true
  });

  return VideoCourse;
};