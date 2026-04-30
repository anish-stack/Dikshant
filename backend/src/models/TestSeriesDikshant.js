'use strict';

const { Model, DataTypes, UUIDV4 } = require('sequelize');

module.exports = (sequelize) => {
  class TestSeriesDikshant extends Model {
    static associate(models) {
      // TestSeries has many Tests
      TestSeriesDikshant.hasMany(models.TestDikshant, {
        foreignKey: 'series_id',
        as: 'tests',
        onDelete: 'CASCADE',
      });
    }
  }

  TestSeriesDikshant.init(
    {
      id: {
        type: DataTypes.CHAR(36),
        defaultValue: UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: { notEmpty: true, len: [3, 255] },
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { notEmpty: true },
      },
      type: {
        type: DataTypes.ENUM('prelims', 'mains', 'combined'),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      total_tests: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      discount_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
      },
      is_free: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      thumbnail_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      meta_tags: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Array of searchable tags e.g. ["GS1","Environment"]',
      },
      syllabus_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      validity_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'null = lifetime access',
      },
      display_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_by: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        comment: 'FK to users table (admin who created)',
      },
      deletedAt: {
        type: DataTypes.DATE,
        field: "deleted_at",
        allowNull: true,
      }
    },
    {
      sequelize,
      modelName: "TestSeriesDikshant",
      tableName: "test_series_dikshant",

      timestamps: true,
      paranoid: true,

      createdAt: "createdAt",
      updatedAt: "updatedAt",
      deletedAt: "deleted_at",

      indexes: [
        { fields: ["slug"], unique: true, name: "uq_series_slug" },
        { fields: ["type"], name: "idx_series_type" },
        { fields: ["is_active"], name: "idx_series_active" },
        { fields: ["created_by"], name: "idx_series_created_by" },
      ],
    }
  );

  return TestSeriesDikshant;
};
