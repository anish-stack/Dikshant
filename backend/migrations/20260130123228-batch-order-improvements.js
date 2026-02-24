'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Running SAFE batch improvements migration...');

      const ordersTable = await queryInterface.describeTable('orders');

      // ================= ORDERS TABLE =================

      const addColumnIfNotExists = async (table, column, definition) => {
        const tableDesc = await queryInterface.describeTable(table);
        if (!tableDesc[column]) {
          await queryInterface.addColumn(table, column, definition, {
            transaction,
          });
        } else {
          console.log(`ℹ️ Column ${column} already exists`);
        }
      };

      await addColumnIfNotExists('orders', 'parentOrderId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment:
          'References parent batch order if this is a child quiz/test order',
      });

      await addColumnIfNotExists('orders', 'accessValidityDays', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await addColumnIfNotExists('orders', 'expiryDate', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      await addColumnIfNotExists('orders', 'isEmi', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      });

      await addColumnIfNotExists('orders', 'totalEmiAmount', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });

      await addColumnIfNotExists('orders', 'emiMonths', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      await addColumnIfNotExists('orders', 'emiPerInstallment', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });

      await addColumnIfNotExists('orders', 'currentEmiInstallment', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      });

      await addColumnIfNotExists('orders', 'emiStatus', {
        type: Sequelize.ENUM('active', 'paused', 'completed', 'defaulted'),
        defaultValue: 'active',
      });

      await addColumnIfNotExists('orders', 'nextEmiDueDate', {
        type: Sequelize.DATE,
        allowNull: true,
      });

      // ========== CREATE EMI PAYMENTS TABLE (SAFE) ==========

      const tables = await queryInterface.showAllTables();

      if (!tables.includes('emi_payments')) {
        await queryInterface.createTable(
          'emi_payments',
          {
            id: {
              type: Sequelize.INTEGER,
              autoIncrement: true,
              primaryKey: true,
            },
            orderId: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            userId: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            batchId: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            installmentNumber: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            amount: {
              type: Sequelize.FLOAT,
              allowNull: false,
            },
            dueDate: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            status: {
              type: Sequelize.ENUM(
                'pending',
                'paid',
                'failed',
                'overdue'
              ),
              defaultValue: 'pending',
            },
            razorpayOrderId: Sequelize.STRING,
            razorpayPaymentId: Sequelize.STRING,
            razorpaySignature: Sequelize.STRING,
            paidDate: Sequelize.DATE,
            reason: Sequelize.STRING,
            notes: Sequelize.TEXT,
            createdAt: {
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal(
                'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
              ),
            },
          },
          { transaction }
        );
      } else {
        console.log('ℹ️ emi_payments table already exists');
      }

      await transaction.commit();
      console.log('✅ SAFE Migration completed successfully!');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async () => {
    console.log('⚠️ Down migration skipped for safety');
  },
};