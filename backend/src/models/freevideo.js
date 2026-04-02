"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class FreeVideo extends Model {
        static associate(models) {
            FreeVideo.belongsTo(models.FreeVideoPlaylist, {
                foreignKey: "playlistId",
                as: "playlist",
            });
        }
    }

    FreeVideo.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            playlistId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            title: {
                type: DataTypes.STRING,
                allowNull: false,
            },
            description: {
                type: DataTypes.TEXT(10000),
                allowNull: true,
            },
            position: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            youtubeUrl: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            youtubeVideoId: {
                type: DataTypes.STRING,
                allowNull: true,
            },


            duration: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            position: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            status: {
                type: DataTypes.ENUM("active", "inactive"),
                defaultValue: "active",
            },
        },
        {
            sequelize,
            modelName: "FreeVideo",
            tableName: "free_videos",
            timestamps: true,
        }
    );

    return FreeVideo;
};