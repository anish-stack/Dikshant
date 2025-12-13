'use strict';

module.exports = (sequelize, DataTypes) => {
  const VideoCourse = sequelize.define('VideoCourse', {

    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    imageUrl: DataTypes.STRING,
    title: DataTypes.STRING,
    videoSource: DataTypes.ENUM("youtube", "s3"),
    url: DataTypes.STRING,

    batchId: DataTypes.INTEGER,
    subjectId: DataTypes.INTEGER,

    isDownloadable: DataTypes.BOOLEAN,
    isDemo: DataTypes.BOOLEAN,

    status: DataTypes.ENUM("active", "inactive"),

    programId: DataTypes.INTEGER

  }, {
    tableName: 'videocourses',
    timestamps: true
  });

  VideoCourse.associate = function (models) {
    VideoCourse.belongsTo(models.Program, { foreignKey: "programId", as: "program" });
  };

  return VideoCourse;
};
