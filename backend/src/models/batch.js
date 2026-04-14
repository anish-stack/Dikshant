'use strict';

module.exports = (sequelize, DataTypes) => {
  const Batch = sequelize.define('Batch', {

    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },

    name: DataTypes.STRING,
    slug: DataTypes.STRING,

    imageUrl: DataTypes.STRING,

    displayOrder: DataTypes.INTEGER,
    programId: DataTypes.INTEGER,

    subjectId: DataTypes.JSON,                    // Main batch subjects

    separatePurchaseSubjectIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],

      get() {
        const val = this.getDataValue('separatePurchaseSubjectIds');
        if (!val) return [];
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch (e) {
            console.error('Error parsing separatePurchaseSubjectIds:', e);
            return [];
          }
        }
        return Array.isArray(val) ? val : [];
      },

      set(value) {
        if (typeof value === 'string') {
          try {
            this.setDataValue('separatePurchaseSubjectIds', JSON.parse(value));
          } catch (e) {
            console.error('Failed to parse separatePurchaseSubjectIds:', e);
            this.setDataValue('separatePurchaseSubjectIds', []);
          }
        } else if (Array.isArray(value)) {
          this.setDataValue('separatePurchaseSubjectIds', value);
        } else {
          this.setDataValue('separatePurchaseSubjectIds', []);
        }
      },
    },
    medium: {
      type: DataTypes.STRING(2000),
      allowNull: false,
      defaultValue: "Hindi / English",
    },

    offerText: {
      type: DataTypes.STRING(1000),
      allowNull: true,
    },

    fee_one_time: {
      type: DataTypes.STRING(1500),
      allowNull: true,
    },

    fee_inst: {
      type: DataTypes.STRING(1500),
      allowNull: true,
    },

    note: {
      type: DataTypes.STRING(2000),
      allowNull: true,
    },

    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,

    registrationStartDate: DataTypes.DATE,
    registrationEndDate: DataTypes.DATE,

    status: DataTypes.ENUM('active', 'inactive', 'upcoming'), // Added 'upcoming' as used in frontend

    shortDescription: DataTypes.TEXT,     // Changed to TEXT (better for HTML content)
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

    position: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    category: DataTypes.STRING,

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

    Batch.hasMany(models.Order, {
      foreignKey: 'itemId',
      as: 'orders',
      constraints: false
    });
  };

  return Batch;
};