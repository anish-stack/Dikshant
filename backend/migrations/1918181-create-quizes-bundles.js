"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Quizes_bundles", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      imageUrl: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      slug: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      price: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },

      discountPrice: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },

      gst: {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
      },

      displayOrder: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },

      expirBundle: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Helpful indexes
    await queryInterface.addIndex("Quizes_bundles", ["slug"], {
      unique: true,
      name: "quizes_bundles_slug_unique",
    });

    await queryInterface.addIndex("Quizes_bundles", ["isActive"], {
      name: "quizes_bundles_isActive_idx",
    });

    await queryInterface.addIndex("Quizes_bundles", ["displayOrder"], {
      name: "quizes_bundles_displayOrder_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Quizes_bundles");
  },
};