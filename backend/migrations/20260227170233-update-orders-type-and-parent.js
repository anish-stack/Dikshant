'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const table = await queryInterface.describeTable("orders");

    /*
    =========================================
    1️⃣ Update ENUM type safely
    =========================================
    */

    await queryInterface.changeColumn('orders', 'type', {
      type: Sequelize.ENUM(
        "batch",
        "test",
        "quiz",
        "quiz_bundle",
        "test_series_bundle"
      ),
      allowNull: true
    });

    console.log("Order type ENUM updated");

    /*
    =========================================
    2️⃣ Add parentOrderId only if not exists
    =========================================
    */

    if (!table.parentOrderId) {

      await queryInterface.addColumn('orders', 'parentOrderId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'orders',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      await queryInterface.addIndex('orders', ['parentOrderId'], {
        name: 'idx_orders_parentOrderId'
      });

      console.log("parentOrderId column added");

    } else {
      console.log("parentOrderId already exists, skipping...");
    }

  },

  async down(queryInterface, Sequelize) {

    // Revert ENUM
    await queryInterface.changeColumn('orders', 'type', {
      type: Sequelize.ENUM(
        "batch",
        "test",
        "quiz"
      ),
      allowNull: true
    });

    // Remove parentOrderId if exists
    const table = await queryInterface.describeTable("orders");

    if (table.parentOrderId) {

      await queryInterface
        .removeIndex('orders', 'idx_orders_parentOrderId')
        .catch(() => {});

      await queryInterface.removeColumn('orders', 'parentOrderId');

      console.log("parentOrderId removed");
    }

  }
};