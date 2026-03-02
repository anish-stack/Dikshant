'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 🔹 Bundle Table
    await queryInterface.createTable('testseries_bundles', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      imageUrl: Sequelize.STRING,
      title: Sequelize.STRING,
      slug: {
        type: Sequelize.STRING,
        unique: true,
      },
      description: Sequelize.TEXT,
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      price: Sequelize.FLOAT,
      discountPrice: Sequelize.FLOAT,
      gst: Sequelize.FLOAT,
      displayOrder: Sequelize.INTEGER,
      expirBundle: Sequelize.DATE,
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 🔹 Pivot Table
    await queryInterface.createTable('testseries_bundle_items', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      bundleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'testseries_bundles',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      testSeriesId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'testseriess', // your exact table name
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 🔥 Prevent duplicate entries
    await queryInterface.addConstraint('testseries_bundle_items', {
      fields: ['bundleId', 'testSeriesId'],
      type: 'unique',
      name: 'uniq_bundle_testseries',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('testseries_bundle_items');
    await queryInterface.dropTable('testseries_bundles');
  },
};