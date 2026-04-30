'use strict';

// ============================================================
// DIKSHANT IAS — Phase 2: Commerce Models
// CouponDikshant | StudentPurchaseDikshant | RankingDikshant
// ============================================================

const { Model, DataTypes, UUIDV4 } = require('sequelize');

// ─────────────────────────────────────────────────────────────
// 1. COUPON
// ─────────────────────────────────────────────────────────────
class CouponDikshant extends Model {
  static associate(models) {
    CouponDikshant.hasMany(models.StudentPurchaseDikshant, {
      foreignKey: 'coupon_id',
      as: 'purchases',
    });
    CouponDikshant.hasMany(models.ReferralDikshant, {
      foreignKey: 'coupon_id',
      as: 'referrals',
    });
  }

  isValid(amount = 0) {
    const now = new Date();
    if (!this.is_active) return false;
    if (this.valid_from > now || this.valid_until < now) return false;
    if (this.max_uses !== null && this.used_count >= this.max_uses) return false;
    if (amount < this.min_amount) return false;
    return true;
  }

  computeDiscount(amount) {
    if (!this.isValid(amount)) return 0;
    let discount =
      this.discount_type === 'percent'
        ? (amount * this.discount_value) / 100
        : this.discount_value;
    if (this.max_discount_cap !== null) {
      discount = Math.min(discount, this.max_discount_cap);
    }
    return Math.min(discount, amount);
  }
}

const CouponModel = (sequelize) => {
  CouponDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        set(val) { this.setDataValue('code', val.toUpperCase().trim()); },
      },
      discount_type: {
        type: DataTypes.ENUM('flat', 'percent'),
        allowNull: false,
      },
      discount_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: { min: 0 },
      },
      max_uses: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
      },
      single_use_per_user: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      used_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      min_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      max_discount_cap: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      valid_from: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      valid_until: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      applicable_series: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      applicable_tests: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_by: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      referral_user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'CouponDikshant',
      tableName: 'coupons_dikshant',
      paranoid: true,
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['code'], name: 'uq_coupon_code' },
        { fields: ['is_active'], name: 'idx_coupon_active' },
        { fields: ['valid_until'], name: 'idx_coupon_valid_until' },
      ],
    }
  );
  return CouponDikshant;
};


// ─────────────────────────────────────────────────────────────
// 2. STUDENT PURCHASE
// ─────────────────────────────────────────────────────────────
class StudentPurchaseDikshant extends Model {
  static associate(models) {
    StudentPurchaseDikshant.belongsTo(models.TestSeriesDikshant, {
      foreignKey: 'series_id',
      as: 'series',
    });
    StudentPurchaseDikshant.belongsTo(models.TestDikshant, {
      foreignKey: 'test_id',
      as: 'test',
    });
    StudentPurchaseDikshant.belongsTo(models.CouponDikshant, {
      foreignKey: 'coupon_id',
      as: 'coupon',
    });
  }
}

const StudentPurchaseModel = (sequelize) => {
  StudentPurchaseDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      series_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        defaultValue: null,
        references: { model: 'test_series_dikshant', key: 'id' },
      },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        defaultValue: null,
        references: { model: 'tests_dikshant', key: 'id' },
      },
      purchase_type: {
        type: DataTypes.ENUM('series', 'single_test'),
        allowNull: false,
      },
      amount_paid: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      original_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      coupon_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: { model: 'coupons_dikshant', key: 'id' },
      },
      discount_applied: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      payment_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      order_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      payment_status: {
        type: DataTypes.ENUM('pending', 'success', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_method: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      payment_gateway: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'razorpay',
      },
      gateway_response: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
      activated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      refund_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      refunded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      refund_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      invoice_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'StudentPurchaseDikshant',
      tableName: 'student_purchases_dikshant',
      paranoid: false,

      createdAt: "createdAt",
      updatedAt: "updatedAt",

      timestamps: true,
      indexes: [
        { fields: ['user_id'], name: 'idx_purchase_user_id' },
        { fields: ['series_id'], name: 'idx_purchase_series_id' },
        { fields: ['test_id'], name: 'idx_purchase_test_id' },
        { fields: ['payment_status'], name: 'idx_purchase_status' },
        { fields: ['payment_id'], name: 'idx_purchase_payment_id' },
        { fields: ['user_id', 'series_id'], name: 'idx_purchase_user_series' },
      ],
    }
  );
  return StudentPurchaseDikshant;
};


// ─────────────────────────────────────────────────────────────
// 3. RANKING
// ─────────────────────────────────────────────────────────────
class RankingDikshant extends Model {
  static associate(models) {
    RankingDikshant.belongsTo(models.TestDikshant, {
      foreignKey: 'test_id',
      as: 'test',
    });
    RankingDikshant.belongsTo(models.TestAttemptDikshant, {
      foreignKey: 'attempt_id',
      as: 'attempt',
    });
  }
}

const RankingModel = (sequelize) => {
  RankingDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'tests_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      attempt_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'test_attempts_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      rank: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      total_participants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      percentile: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      badge: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'topper / top10 / top50 / top100',
      },
      rank_change: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'vs previous test in same series',
      },
      subject_scores: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      subject_ranks: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      correct_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      wrong_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      unattempted_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      time_spent_seconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      is_published: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      calculated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'RankingDikshant',
      tableName: 'rankings_dikshant',
      paranoid: false,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      timestamps: true,
      indexes: [
        { unique: true, fields: ['test_id', 'user_id'], name: 'uq_ranking_test_user' },
        { fields: ['test_id'], name: 'idx_ranking_test_id' },
        { fields: ['user_id'], name: 'idx_ranking_user_id' },
        { fields: ['test_id', 'rank'], name: 'idx_ranking_rank' },
        { fields: ['test_id', 'score'], name: 'idx_ranking_score' },
        { fields: ['is_published'], name: 'idx_ranking_published' },
      ],
    }
  );
  return RankingDikshant;
};


module.exports = { CouponModel, StudentPurchaseModel, RankingModel };
