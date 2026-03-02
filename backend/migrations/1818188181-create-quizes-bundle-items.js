"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = "Quizes_bundle_items";

    // 1) Check table exists
    const tables = await queryInterface.showAllTables();
    const exists = tables
      .map((t) => (typeof t === "object" ? t.tableName : t))
      .includes(tableName);

    if (!exists) {
      // ✅ Fresh create
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },

        bundleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Quizes_bundles", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },

        quizId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "quizzes", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
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
    } else {
      // ✅ Table exists: ensure required columns exist
      const desc = await queryInterface.describeTable(tableName);

      // Some older schemas may have different names
      // We'll add required columns if missing.
      if (!desc.bundleId) {
        await queryInterface.addColumn(tableName, "bundleId", {
          type: Sequelize.INTEGER,
          allowNull: true, // allowNull true first (in case existing rows)
        });
      }

      if (!desc.quizId) {
        await queryInterface.addColumn(tableName, "quizId", {
          type: Sequelize.INTEGER,
          allowNull: true,
        });
      }

      // If older columns exist, try to copy data into new columns
      // (Optional but very useful)
      const hasOldBundle = desc.bundle_id || desc.bundleID;
      const hasOldQuiz = desc.quizesId || desc.QuizesId || desc.quiz_id;

      if (hasOldBundle && !desc.bundleId) {
        await queryInterface.sequelize.query(`
          UPDATE ${tableName}
          SET bundleId = bundle_id
          WHERE bundleId IS NULL
        `);
      }

      if ((desc.QuizesId || desc.quizesId || desc.quiz_id) && !desc.quizId) {
        if (desc.QuizesId) {
          await queryInterface.sequelize.query(`
            UPDATE ${tableName}
            SET quizId = QuizesId
            WHERE quizId IS NULL
          `);
        } else if (desc.quizesId) {
          await queryInterface.sequelize.query(`
            UPDATE ${tableName}
            SET quizId = quizesId
            WHERE quizId IS NULL
          `);
        } else if (desc.quiz_id) {
          await queryInterface.sequelize.query(`
            UPDATE ${tableName}
            SET quizId = quiz_id
            WHERE quizId IS NULL
          `);
        }
      }

      // Now make them NOT NULL if data exists
      await queryInterface.changeColumn(tableName, "bundleId", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });

      await queryInterface.changeColumn(tableName, "quizId", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });

      // Add foreign keys (only if not already there)
      // MySQL doesn't provide easy introspection via Sequelize,
      // so we use try/catch to avoid crashing.
      try {
        await queryInterface.addConstraint(tableName, {
          fields: ["bundleId"],
          type: "foreign key",
          name: "fk_quizes_bundle_items_bundleId",
          references: { table: "Quizes_bundles", field: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        });
      } catch (e) {}

      try {
        await queryInterface.addConstraint(tableName, {
          fields: ["quizId"],
          type: "foreign key",
          name: "fk_quizes_bundle_items_quizId",
          references: { table: "quizzes", field: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        });
      } catch (e) {}
    }

    // 2) Unique constraint (avoid duplicates)
    // Add only if columns exist (prevents your exact error)
    const finalDesc = await queryInterface.describeTable(tableName);
    if (finalDesc.bundleId && finalDesc.quizId) {
      try {
        await queryInterface.addConstraint(tableName, {
          fields: ["bundleId", "quizId"],
          type: "unique",
          name: "quizes_bundle_items_bundleId_quizId_unique",
        });
      } catch (e) {}
    }

    // 3) Indexes
    try {
      await queryInterface.addIndex(tableName, ["bundleId"], {
        name: "quizes_bundle_items_bundleId_idx",
      });
    } catch (e) {}

    try {
      await queryInterface.addIndex(tableName, ["quizId"], {
        name: "quizes_bundle_items_quizId_idx",
      });
    } catch (e) {}
  },

  async down(queryInterface) {
    await queryInterface.dropTable("Quizes_bundle_items");
  },
};