"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class FreeVideoPlaylist extends Model {
        static associate(models) {
            FreeVideoPlaylist.belongsTo(models.Subject, {
                foreignKey: "subjectId",
                as: "subject",
            });

            FreeVideoPlaylist.hasMany(models.FreeVideo, {
                foreignKey: "playlistId",
                as: "videos",
                onDelete: "CASCADE",
            });
        }
    }

    FreeVideoPlaylist.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            title: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            slug: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },

            position: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },



            subjectId: {
                type: DataTypes.INTEGER,
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
            modelName: "FreeVideoPlaylist",
            tableName: "free_video_playlists",
            timestamps: true,
        }
    );

    return FreeVideoPlaylist;
};