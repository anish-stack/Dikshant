'use strict';

module.exports = (sequelize, DataTypes) => {
  const CourseProgress = sequelize.define(
    "CourseProgress",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },

      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Which batch/course the student enrolled in",
      },

      videoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "ID from videocourses table",
      },

      // Total duration of video (in seconds) - stored once
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Total video length in seconds",
      },

      // How much user has watched (in seconds)
      watchedSeconds: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: "Last watched position in seconds",
      },

      // Percentage (0 to 100)
      percentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        validate: { min: 0, max: 100 },
      },

      // Is video fully watched?
      isCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },

      // Last time user watched this video
      lastWatchedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },

      // Optional: number of times video was opened
      viewCount: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      // Optional: resume point saved locally (for offline fallback)
      localResumePoint: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      tableName: "course_progress",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "batchId", "videoId"],
          name: "unique_user_video_progress",
        },
        { fields: ["userId"] },
        { fields: ["batchId"] },
        { fields: ["isCompleted"] },
      ],
    }
  );

  // Associations
  CourseProgress.associate = function (models) {
    // One progress belongs to one user
    CourseProgress.belongsTo(models.User, { foreignKey: "userId", as: "user" });

    // One progress belongs to one batch
    CourseProgress.belongsTo(models.Batch, { foreignKey: "batchId", as: "batch" });

    // One progress belongs to one video
    CourseProgress.belongsTo(models.VideoCourse, {
      foreignKey: "videoId",
      as: "video",
    });
  };

  return CourseProgress;
};