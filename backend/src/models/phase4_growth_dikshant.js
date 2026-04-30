'use strict';

// ============================================================
// DIKSHANT IAS — Phase 4: Growth Models
// NotificationDikshant | LeaderboardDikshant | ReportDikshant
// UserStreakDikshant | ReferralDikshant | WeakAreaDikshant
// ============================================================

const { Model, DataTypes, UUIDV4 } = require('sequelize');


// ─────────────────────────────────────────────────────────────
// 1. NOTIFICATION
// ─────────────────────────────────────────────────────────────
class NotificationDikshant extends Model {
  static associate(models) {
    // notifications belong to user (nullable for broadcast)
    // no FK enforced — user_id null = broadcast
  }
}

const NotificationModel = (sequelize) => {
  NotificationDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        defaultValue: null,
        comment: 'null = broadcast to all users',
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM(
          'reminder','result','purchase','announcement',
          'streak','rank_badge','evaluation_done','test_live'
        ),
        allowNull: false,
        defaultValue: 'announcement',
      },
      channel: {
        type: DataTypes.ENUM('in_app','email','push','whatsapp','sms'),
        allowNull: false,
        defaultValue: 'in_app',
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      scheduled_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'null = send immediately',
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      failed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      retry_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      batch_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        comment: 'groups bulk notifications for same campaign',
      },
      clicked_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '{"test_id":"xxx","series_id":"yyy","deep_link":"/test/xxx"}',
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'NotificationDikshant',
      tableName: 'notifications_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['user_id'],                name: 'idx_notif_user_id' },
        { fields: ['type'],                   name: 'idx_notif_type' },
        { fields: ['channel'],                name: 'idx_notif_channel' },
        { fields: ['user_id', 'is_read'],     name: 'idx_notif_is_read' },
        { fields: ['scheduled_at'],           name: 'idx_notif_scheduled_at' },
        { fields: ['sent_at'],                name: 'idx_notif_sent_at' },
      ],
    }
  );
  return NotificationDikshant;
};


// ─────────────────────────────────────────────────────────────
// 2. LEADERBOARD
// ─────────────────────────────────────────────────────────────
class LeaderboardDikshant extends Model {
  static associate(models) {
    LeaderboardDikshant.belongsTo(models.TestDikshant, {
      foreignKey: 'test_id',
      as: 'test',
    });
  }
}

const LeaderboardModel = (sequelize) => {
  LeaderboardDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      test_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        references: { model: 'tests_dikshant', key: 'id' },
        onDelete: 'CASCADE',
      },
      snapshot_type: {
        type: DataTypes.ENUM('live', 'final'),
        allowNull: false,
        defaultValue: 'final',
      },
      snapshot_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      total_participants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      top_entries: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: '[{rank, user_id, name, score, percentile}] — top 100',
      },
      subject_toppers: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '{"GS1":{user_id,score},"CSAT":{user_id,score}}',
      },
      topper_score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      average_score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      cutoff_score: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'LeaderboardDikshant',
      tableName: 'leaderboards_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['test_id'],                       name: 'idx_lb_test_id' },
        { fields: ['test_id', 'snapshot_type'],      name: 'idx_lb_snapshot_type' },
      ],
    }
  );
  return LeaderboardDikshant;
};


// ─────────────────────────────────────────────────────────────
// 3. REPORT
// ─────────────────────────────────────────────────────────────
class ReportDikshant extends Model {
  static associate(models) {}
}

const ReportModel = (sequelize) => {
  ReportDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      report_type: {
        type: DataTypes.ENUM(
          'revenue','attempts','series_performance',
          'evaluator_performance','coupon_usage','student_growth'
        ),
        allowNull: false,
      },
      period_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      period_end: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      entity_type: {
        type: DataTypes.ENUM('global','series','test','evaluator'),
        allowNull: false,
        defaultValue: 'global',
      },
      entity_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      data: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      generated_by: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      generated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      file_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      is_scheduled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      schedule_cron: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ReportDikshant',
      tableName: 'reports_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['report_type'],                  name: 'idx_report_type' },
        { fields: ['period_start', 'period_end'],   name: 'idx_report_period' },
        { fields: ['entity_type', 'entity_id'],     name: 'idx_report_entity' },
      ],
    }
  );
  return ReportDikshant;
};


// ─────────────────────────────────────────────────────────────
// 4. USER STREAK
// ─────────────────────────────────────────────────────────────
class UserStreakDikshant extends Model {
  static associate(models) {}

  shouldResetStreak() {
    if (!this.last_active_date) return false;
    const last = new Date(this.last_active_date);
    const today = new Date();
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    // 1 day gap allowed (yesterday = active). 2+ days = broken streak
    return diffDays > 1;
  }
}

const UserStreakModel = (sequelize) => {
  UserStreakDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: true,
      },
      current_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      longest_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      rank_badge: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Beginner / Rising Star / Expert / Master',
      },
      milestone_badges: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '["5-streak","10-test","top-10"]',
      },
      last_active_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      total_tests_attempted: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_days_active: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      streak_freeze_used: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      streak_freeze_available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: 'UserStreakDikshant',
      tableName: 'user_streaks_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['user_id'],     name: 'uq_streak_user_id' },
        { fields: ['last_active_date'],           name: 'idx_streak_last_active' },
      ],
    }
  );
  return UserStreakDikshant;
};


// ─────────────────────────────────────────────────────────────
// 5. REFERRAL
// ─────────────────────────────────────────────────────────────
class ReferralDikshant extends Model {
  static associate(models) {
    ReferralDikshant.belongsTo(models.CouponDikshant, {
      foreignKey: 'coupon_id',
      as: 'coupon',
    });
  }
}

const ReferralModel = (sequelize) => {
  ReferralDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      referrer_user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      referred_user_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      referral_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      coupon_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: { model: 'coupons_dikshant', key: 'id' },
        onDelete: 'SET NULL',
      },
      status: {
        type: DataTypes.ENUM('pending','registered','converted'),
        allowNull: false,
        defaultValue: 'pending',
      },
      referred_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      channel: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'whatsapp / email / copy-link',
      },
      registered_at: { type: DataTypes.DATE, allowNull: true },
      converted_at:  { type: DataTypes.DATE, allowNull: true },
      reward_given: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reward_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      reward_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ReferralDikshant',
      tableName: 'referrals_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        { unique: true, fields: ['referral_code'],  name: 'uq_referral_code' },
        { fields: ['referrer_user_id'],             name: 'idx_referral_referrer' },
        { fields: ['referred_user_id'],             name: 'idx_referral_referred' },
        { fields: ['status'],                       name: 'idx_referral_status' },
      ],
    }
  );
  return ReferralDikshant;
};


// ─────────────────────────────────────────────────────────────
// 6. WEAK AREA
// ─────────────────────────────────────────────────────────────
class WeakAreaDikshant extends Model {
  static associate(models) {
    WeakAreaDikshant.belongsTo(models.TestSeriesDikshant, {
      foreignKey: 'series_id',
      as: 'series',
    });
  }
}

const WeakAreaModel = (sequelize) => {
  WeakAreaDikshant.init(
    {
      id: { type: DataTypes.CHAR(36), defaultValue: UUIDV4, primaryKey: true },
      user_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
      },
      series_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
        references: { model: 'test_series_dikshant', key: 'id' },
        onDelete: 'SET NULL',
      },
      subject: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      topic: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      total_questions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
      accuracy_percent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      improvement_trend: {
        type: DataTypes.ENUM('improving', 'declining', 'stable'),
        allowNull: true,
      },
      recommended_topics: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      avg_time_per_q: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      difficulty_breakdown: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '{"easy":{correct,total},"medium":{...},"hard":{...}}',
      },
      last_test_id: {
        type: DataTypes.CHAR(36),
        allowNull: true,
      },
      last_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'WeakAreaDikshant',
      tableName: 'weak_areas_dikshant',
      paranoid: false,
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'series_id', 'subject', 'topic'],
          name: 'uq_weakarea_user_series_subject_topic',
        },
        { fields: ['user_id'],                          name: 'idx_weakarea_user_id' },
        { fields: ['user_id', 'accuracy_percent'],      name: 'idx_weakarea_accuracy' },
        { fields: ['subject'],                          name: 'idx_weakarea_subject' },
      ],
    }
  );
  return WeakAreaDikshant;
};


module.exports = {
  NotificationModel,
  LeaderboardModel,
  ReportModel,
  UserStreakModel,
  ReferralModel,
  WeakAreaModel,
};
