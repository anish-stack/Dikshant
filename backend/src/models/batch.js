'use strict';

module.exports = (sequelize, DataTypes) => {
  const Batch = sequelize.define('Batch', {

    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    name: DataTypes.STRING,
    slug: DataTypes.STRING,

    imageUrl: DataTypes.STRING,

    displayOrder: DataTypes.INTEGER,
    programId: DataTypes.INTEGER,
    subjectId: DataTypes.JSON,

    medium: {
      type: DataTypes.STRING(2000),
      allowNull: false,
      defaultValue: "Hindi / English",
    },

    offerText: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      defaultValue: null,
    },

    fee_one_time: {
      type: DataTypes.STRING(1500),
      allowNull: true,
      defaultValue: null,
    },

    fee_inst: {
      type: DataTypes.STRING(1500),
      allowNull: true,
      defaultValue: null,
    },
    note: {
      type: DataTypes.STRING(2000),
      allowNull: true,
      defaultValue: null,
    },

    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,

    registrationStartDate: DataTypes.DATE,
    registrationEndDate: DataTypes.DATE,

    status: DataTypes.ENUM('active', 'inactive'),

    shortDescription: DataTypes.STRING,
    longDescription: DataTypes.TEXT,

    batchPrice: DataTypes.FLOAT,
    batchDiscountPrice: DataTypes.FLOAT,
    gst: DataTypes.FLOAT,
    offerValidityDays: DataTypes.INTEGER,
    quizIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    testSeriesIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },

    isEmi: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    emiTotal: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    emiSchedule: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },

    category: {
      type: DataTypes.STRING
    },
    c_status: {
      type: DataTypes.ENUM(
        "Start Soon",
        "In Progress",
        "Partially Complete",
        "Completed"
      ),
      defaultValue: "Start Soon",
    },


  }, {
    tableName: 'batchs',
    timestamps: true
  });

  Batch.associate = function (models) {
    Batch.belongsTo(models.Program, { foreignKey: 'programId', as: 'program' });
    Batch.hasMany(models.CourseProgress, { foreignKey: 'batchId', as: 'progress' });
    Batch.belongsToMany(models.Subject, { through: "batch_subjects" });

    Batch.belongsToMany(models.Announcement, {
      through: "AnnouncementBatches",
      as: "announcements",
      foreignKey: "batchId",
      otherKey: "announcementId",
    });
    // Add this line:
    Batch.hasMany(models.Order, {
      foreignKey: 'itemId',
      as: 'orders',
      constraints: false
    });
  };

  return Batch;
};

