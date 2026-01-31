'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Running migration: Add batch improvements...');

      // ============ UPDATE ORDERS TABLE ============
      console.log('📝 Updating orders table...');

      // Add parentOrderId for batch-child relationships
      await queryInterface.addColumn(
        'orders',
        'parentOrderId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'orders', key: 'id' },
          comment: 'References parent batch order if this is a child quiz/test order'
        },
        { transaction }
      );

      // Add access validity fields
      await queryInterface.addColumn(
        'orders',
        'accessValidityDays',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          comment: 'Number of days of access from paymentDate'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'expiryDate',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Calculated expiry = paymentDate + accessValidityDays'
        },
        { transaction }
      );

      // Add EMI fields
      await queryInterface.addColumn(
        'orders',
        'isEmi',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: 'Is this order purchased via EMI?'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'totalEmiAmount',
        {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: 'Total amount to be paid via EMI'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'emiMonths',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Number of months for EMI'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'emiPerInstallment',
        {
          type: Sequelize.FLOAT,
          allowNull: true,
          comment: 'Amount per installment'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'currentEmiInstallment',
        {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'How many installments paid so far'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'emiStatus',
        {
          type: Sequelize.ENUM('active', 'paused', 'completed', 'defaulted'),
          defaultValue: 'active',
          comment: 'Status of EMI payment plan'
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'orders',
        'nextEmiDueDate',
        {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'When is the next installment due?'
        },
        { transaction }
      );

      // Update enrollmentStatus enum to include suspended state
      await queryInterface.changeColumn(
        'orders',
        'enrollmentStatus',
        {
          type: Sequelize.ENUM('active', 'suspended', 'cancelled', 'completed'),
          defaultValue: 'active',
          comment: 'Current enrollment status'
        },
        { transaction }
      );

      // Add indexes on orders table
      await queryInterface.addIndex(
        'orders',
        ['parentOrderId'],
        { transaction, name: 'idx_orders_parentOrderId' }
      );

      await queryInterface.addIndex(
        'orders',
        ['expiryDate'],
        { transaction, name: 'idx_orders_expiryDate' }
      );

      await queryInterface.addIndex(
        'orders',
        ['enrollmentStatus'],
        { transaction, name: 'idx_orders_enrollmentStatus' }
      );

      // ============ UPDATE BATCHS TABLE ============
      console.log('📝 Updating batchs table...');

      await queryInterface.addColumn(
        'batchs',
        'accessValidityDays',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 365,
          comment: 'Number of days user can access this batch after purchase'
        },
        { transaction }
      );

      // Add index for isEmi if not exists
      try {
        await queryInterface.addIndex(
          'batchs',
          ['isEmi'],
          { transaction, name: 'idx_batch_isEmi' }
        );
      } catch (error) {
        console.log('ℹ️ Index idx_batch_isEmi already exists');
      }

      // ============ CREATE EMI_PAYMENTS TABLE ============
      console.log('📝 Creating emi_payments table...');

      await queryInterface.createTable(
        'emi_payments',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
          },

          orderId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'orders', key: 'id' },
            onDelete: 'CASCADE',
            comment: 'Reference to the parent batch order'
          },

          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: 'User who is paying the EMI'
          },

          batchId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'batchs', key: 'id' },
            onDelete: 'SET NULL',
            comment: 'Reference to batch'
          },

          installmentNumber: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: 'Which installment is this? (1st, 2nd, 3rd, etc.)'
          },

          amount: {
            type: Sequelize.FLOAT,
            allowNull: false,
            comment: 'Amount to be paid for this installment'
          },

          dueDate: {
            type: Sequelize.DATE,
            allowNull: false,
            comment: 'When is this installment due?'
          },

          status: {
            type: Sequelize.ENUM('pending', 'paid', 'failed', 'overdue'),
            defaultValue: 'pending',
            comment: 'Current status of this installment payment'
          },

          razorpayOrderId: {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Razorpay order ID for this installment'
          },

          razorpayPaymentId: {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Razorpay payment ID when paid'
          },

          razorpaySignature: {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Razorpay signature for verification'
          },

          paidDate: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'When was this installment actually paid?'
          },

          reason: {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Reason for payment (USER_INITIATED, ADMIN_ADJUSTED, etc.)'
          },

          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Any additional notes'
          },

          createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },

          updatedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
          }
        },
        { transaction }
      );

      // Add indexes on emi_payments table
      await queryInterface.addIndex(
        'emi_payments',
        ['orderId'],
        { transaction, name: 'idx_emi_orderId' }
      );

      await queryInterface.addIndex(
        'emi_payments',
        ['userId'],
        { transaction, name: 'idx_emi_userId' }
      );

      await queryInterface.addIndex(
        'emi_payments',
        ['status'],
        { transaction, name: 'idx_emi_status' }
      );

      await queryInterface.addIndex(
        'emi_payments',
        ['razorpayOrderId'],
        { transaction, name: 'idx_emi_razorpayOrderId' }
      );

      await transaction.commit();
      console.log('✅ Migration completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Reverting migration...');

      // Drop emi_payments table
      await queryInterface.dropTable('emi_payments', { transaction });

      // Remove indexes from orders
      await queryInterface.removeIndex(
        'orders',
        'idx_orders_parentOrderId',
        { transaction }
      ).catch(() => {});

      await queryInterface.removeIndex(
        'orders',
        'idx_orders_expiryDate',
        { transaction }
      ).catch(() => {});

      await queryInterface.removeIndex(
        'orders',
        'idx_orders_enrollmentStatus',
        { transaction }
      ).catch(() => {});

      // Remove columns from orders
      await queryInterface.removeColumn(
        'orders',
        'parentOrderId',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'accessValidityDays',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'expiryDate',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'isEmi',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'totalEmiAmount',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'emiMonths',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'emiPerInstallment',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'currentEmiInstallment',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'emiStatus',
        { transaction }
      );

      await queryInterface.removeColumn(
        'orders',
        'nextEmiDueDate',
        { transaction }
      );

      // Remove column from batchs
      await queryInterface.removeColumn(
        'batchs',
        'accessValidityDays',
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Revert completed successfully!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Revert failed:', error);
      throw error;
    }
  }
};