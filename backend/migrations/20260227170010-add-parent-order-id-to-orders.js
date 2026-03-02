"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("orders");

    // ✅ Add column only if not exists
    if (!table.parentOrderId) {
      await queryInterface.addColumn("orders", "parentOrderId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });

      await queryInterface.addIndex("orders", ["parentOrderId"], {
        name: "idx_orders_parentOrderId",
      });

      console.log("parentOrderId column added");
    } else {
      console.log("parentOrderId already exists, skipping...");
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("orders");

    if (table.parentOrderId) {
      await queryInterface
        .removeIndex("orders", "idx_orders_parentOrderId")
        .catch(() => {});

      await queryInterface.removeColumn("orders", "parentOrderId");
      console.log("parentOrderId removed");
    }
  },
};