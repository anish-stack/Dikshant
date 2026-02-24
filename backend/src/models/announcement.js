'use strict';

module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define(
    'Announcement',
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

      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      publishDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      /* ==========================
         🎨 Styling Fields
      ========================== */

      textColor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#000000',
      },

      backgroundColor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#ffffff',
      },

      width: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '100%',
      },

      height: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'auto',
      },

      textSize: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '16px',
      },

      /* ==========================
         🖼 Image Field
      ========================== */

      image: {
        type: DataTypes.STRING, // store image URL or file path
        allowNull: true,
      },

      imageAltText: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      /* ==========================
         ➡ Arrow Styling
      ========================== */

      arrowColor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#ffffff',
      },

      arrowBackgroundColor: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '#000000',
      },
      arrowSize:{
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: '22',
      },
      WantPromote: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'announcements',
      timestamps: true,
    }
  );

  /* ==========================
     🔗 Associations
  ========================== */

  Announcement.associate = (models) => {
    Announcement.belongsToMany(models.Batch, {
      through: "AnnouncementBatches",
      as: "promotedBatches",
      foreignKey: "announcementId",
      otherKey: "batchId",
    });
  };

  return Announcement;
};