const { Op, fn, col, literal } = require('sequelize');
const {
  TestAttemptDikshant:TestAttempt, AttemptAnswerDikshant:AttemptAnswer, QuestionDikshant:Question, TestDikshant:Test, TestSeriesDikshant:TestSeries,
  StudentPurchaseDikshant:StudentPurchase, User, RankingDikshant:Ranking, sequelize,
} = require('../models');
const { AppError, asyncHandler } = require('../utils/NewHelpers');
const redis = require("../config/redis");

// ─── Student Analytics ────────────────────────────────────────────────────────

// GET /analytics/my/performance
exports.getMyPerformance = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { series_id } = req.query;

  // All submitted attempts
  const attemptWhere = { user_id: userId, status: { [Op.in]: ['submitted', 'timed_out'] } };
  if (series_id) {
    const tests = await Test.findAll({ where: { series_id }, attributes: ['id'] });
    attemptWhere.test_id = { [Op.in]: tests.map(t => t.id) };
  }

  const attempts = await TestAttempt.findAll({
    where: attemptWhere,
    include: [{ model: Test, attributes: ['id', 'title', 'test_number', 'total_marks', 'series_id'] }],
    order: [['submitted_at', 'ASC']],
  });

  if (!attempts.length) return res.json({ status: 'success', data: { attempts: [], summary: null } });

  // Overall stats
  const totalTests = attempts.length;
  const avgScore = attempts.reduce((s, a) => s + parseFloat(a.score || 0), 0) / totalTests;
  const avgPercentile = attempts.reduce((s, a) => s + parseFloat(a.percentile || 0), 0) / totalTests;
  const bestScore = Math.max(...attempts.map(a => parseFloat(a.score || 0)));
  const totalCorrect = attempts.reduce((s, a) => s + (a.correct_count || 0), 0);
  const totalWrong = attempts.reduce((s, a) => s + (a.wrong_count || 0), 0);
  const totalUnattempted = attempts.reduce((s, a) => s + (a.unattempted_count || 0), 0);

  // Score trend
  const scoreTrend = attempts.map(a => ({
    test_id: a.test_id,
    test_number: a.Test?.test_number,
    test_title: a.Test?.title,
    score: a.score,
    total_marks: a.Test?.total_marks,
    submitted_at: a.submitted_at,
    percentile: a.percentile,
  }));

  // Subject-wise performance
  const allAnswers = await AttemptAnswer.findAll({
    where: { attempt_id: { [Op.in]: attempts.map(a => a.id) } },
    include: [{ model: Question, attributes: ['subject', 'topic', 'difficulty'] }],
  });

  const subjectStats = {};
  const topicStats = {};
  const difficultyStats = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } };

  for (const ans of allAnswers) {
    const subj = ans.Question?.subject || 'Unknown';
    const topic = ans.Question?.topic || 'Unknown';
    const diff = ans.Question?.difficulty || 'medium';

    if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, wrong: 0, unattempted: 0, total: 0 };
    if (!topicStats[topic]) topicStats[topic] = { correct: 0, wrong: 0, total: 0, subject: subj };

    subjectStats[subj].total++;
    topicStats[topic].total++;
    difficultyStats[diff].total++;

    if (ans.is_correct === true) {
      subjectStats[subj].correct++;
      topicStats[topic].correct++;
      difficultyStats[diff].correct++;
    } else if (ans.is_correct === false) {
      subjectStats[subj].wrong++;
      topicStats[topic].wrong++;
    } else {
      subjectStats[subj].unattempted++;
    }
  }

  // Accuracy per subject
  Object.keys(subjectStats).forEach(k => {
    const s = subjectStats[k];
    s.accuracy = s.total > 0 ? ((s.correct / (s.correct + s.wrong)) * 100).toFixed(1) : 0;
  });

  // Weak areas = accuracy < 50%
  const weakAreas = Object.entries(subjectStats)
    .filter(([, v]) => parseFloat(v.accuracy) < 50)
    .map(([subject, stats]) => ({ subject, ...stats }));

  // Weak topics
  const weakTopics = Object.entries(topicStats)
    .filter(([, v]) => v.total >= 3 && (v.correct / v.total) < 0.5)
    .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
    .slice(0, 10)
    .map(([topic, stats]) => ({ topic, ...stats }));

  res.json({
    status: 'success',
    data: {
      summary: {
        total_tests: totalTests,
        avg_score: avgScore.toFixed(2),
        avg_percentile: avgPercentile.toFixed(2),
        best_score: bestScore,
        total_correct: totalCorrect,
        total_wrong: totalWrong,
        total_unattempted: totalUnattempted,
        overall_accuracy: (totalCorrect + totalWrong) > 0
          ? ((totalCorrect / (totalCorrect + totalWrong)) * 100).toFixed(1) : 0,
      },
      score_trend: scoreTrend,
      subject_stats: subjectStats,
      difficulty_stats: difficultyStats,
      weak_areas: weakAreas,
      weak_topics: weakTopics,
    },
  });
});

// GET /analytics/my/attempt/:attempt_id  — detailed single attempt
exports.getAttemptAnalysis = asyncHandler(async (req, res) => {
  const attempt = await TestAttempt.findOne({
    where: { id: req.params.attempt_id, user_id: req.user.id },
  });
  if (!attempt) throw new AppError('Attempt not found', 404);

  const answers = await AttemptAnswer.findAll({
    where: { attempt_id: attempt.id },
    include: [{ model: Question, attributes: ['id', 'subject', 'topic', 'difficulty', 'marks'] }],
  });

  const timeDistribution = answers.map(a => ({
    question_id: a.question_id,
    subject: a.Question?.subject,
    time_spent: a.time_spent_seconds,
    is_correct: a.is_correct,
  }));

  const avgTimeCorrect = answers.filter(a => a.is_correct).reduce((s, a) => s + (a.time_spent_seconds || 0), 0)
    / (answers.filter(a => a.is_correct).length || 1);
  const avgTimeWrong = answers.filter(a => a.is_correct === false).reduce((s, a) => s + (a.time_spent_seconds || 0), 0)
    / (answers.filter(a => a.is_correct === false).length || 1);

  res.json({
    status: 'success',
    data: {
      attempt,
      time_distribution: timeDistribution,
      avg_time_correct: avgTimeCorrect.toFixed(1),
      avg_time_wrong: avgTimeWrong.toFixed(1),
    },
  });
});

// ─── Admin Analytics ──────────────────────────────────────────────────────────

// GET /analytics/test/:id  [admin]
exports.getTestAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cacheKey = `analytics:test:${id}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));

  const test = await Test.findByPk(id);
  if (!test) throw new AppError('Test not found', 404);

  const [totalAttempts, submitted, timedOut] = await Promise.all([
    TestAttempt.count({ where: { test_id: id } }),
    TestAttempt.count({ where: { test_id: id, status: 'submitted' } }),
    TestAttempt.count({ where: { test_id: id, status: 'timed_out' } }),
  ]);

  const scoreStats = await TestAttempt.findOne({
    where: { test_id: id, status: { [Op.in]: ['submitted', 'timed_out'] } },
    attributes: [
      [fn('AVG', col('score')), 'avg_score'],
      [fn('MAX', col('score')), 'max_score'],
      [fn('MIN', col('score')), 'min_score'],
      [fn('STDDEV', col('score')), 'std_dev'],
    ],
    raw: true,
  });

  // Score distribution (buckets)
  const scoreDistribution = await sequelize.query(`
    SELECT
      FLOOR(score / 20) * 20 as bucket,
      COUNT(*) as count
    FROM test_attempts
    WHERE test_id = :testId AND status IN ('submitted','timed_out')
    GROUP BY bucket
    ORDER BY bucket
  `, { replacements: { testId: id }, type: sequelize.QueryTypes.SELECT });

  // Question-level stats
  const questionStats = await sequelize.query(`
    SELECT
      q.id, q.question_text, q.subject, q.topic, q.correct_option,
      COUNT(aa.id) as total_responses,
      SUM(CASE WHEN aa.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      SUM(CASE WHEN aa.selected_option IS NULL THEN 1 ELSE 0 END) as skipped_count,
      AVG(aa.time_spent_seconds) as avg_time
    FROM questions q
    LEFT JOIN attempt_answers aa ON aa.question_id = q.id
    LEFT JOIN test_attempts ta ON ta.id = aa.attempt_id AND ta.status IN ('submitted','timed_out')
    WHERE q.test_id = :testId
    GROUP BY q.id
    ORDER BY q.order_index
  `, { replacements: { testId: id }, type: sequelize.QueryTypes.SELECT });

  const result = {
    status: 'success',
    data: {
      test: { id: test.id, title: test.title, status: test.status },
      participation: { total_attempts: totalAttempts, submitted, timed_out: timedOut },
      score_stats: scoreStats,
      score_distribution: scoreDistribution,
      question_stats: questionStats,
    },
  };

  await redis.setEx(cacheKey, 300, JSON.stringify(result)).catch(() => null);
  res.json(result);
});

// GET /analytics/revenue  [admin]
exports.getRevenueAnalytics = asyncHandler(async (req, res) => {
  const { period = '30', start_date, end_date } = req.query;

  const dateWhere = {};
  if (start_date && end_date) {
    dateWhere.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date)] };
  } else {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(period));
    dateWhere.createdAt = { [Op.gte]: daysAgo };
  }

  const [total, byType, byDay, topSeries] = await Promise.all([
    StudentPurchase.findOne({
      where: { payment_status: 'success', ...dateWhere },
      attributes: [
        [fn('SUM', col('amount_paid')), 'total_revenue'],
        [fn('COUNT', col('id')), 'total_purchases'],
        [fn('AVG', col('amount_paid')), 'avg_order_value'],
      ],
      raw: true,
    }),
    StudentPurchase.findAll({
      where: { payment_status: 'success', ...dateWhere },
      attributes: [
        'purchase_type',
        [fn('SUM', col('amount_paid')), 'revenue'],
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['purchase_type'],
      raw: true,
    }),
    sequelize.query(`
      SELECT DATE(created_at) as date, SUM(amount_paid) as revenue, COUNT(*) as purchases
      FROM student_purchases
      WHERE payment_status = 'success' AND created_at >= DATE_SUB(NOW(), INTERVAL :days DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, { replacements: { days: parseInt(period) }, type: sequelize.QueryTypes.SELECT }),
    sequelize.query(`
      SELECT ts.title, SUM(sp.amount_paid) as revenue, COUNT(*) as purchases
      FROM student_purchases sp
      JOIN test_series ts ON ts.id = sp.series_id
      WHERE sp.payment_status = 'success'
      GROUP BY sp.series_id, ts.title
      ORDER BY revenue DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT }),
  ]);

  res.json({
    status: 'success',
    data: { total, by_type: byType, daily_revenue: byDay, top_series: topSeries },
  });
});

// GET /analytics/overview  [admin] — dashboard stats
exports.getDashboardOverview = asyncHandler(async (req, res) => {
  const cacheKey = 'analytics:dashboard';
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, todayUsers, totalRevenue, todayRevenue, liveTests, totalAttempts, todayAttempts] =
    await Promise.all([
      User.count({ where: { role: 'student' } }),
      User.count({ where: { role: 'student', createdAt: { [Op.gte]: today } } }),
      StudentPurchase.sum('amount_paid', { where: { payment_status: 'success' } }),
      StudentPurchase.sum('amount_paid', { where: { payment_status: 'success', createdAt: { [Op.gte]: today } } }),
      Test.count({ where: { status: 'live' } }),
      TestAttempt.count(),
      TestAttempt.count({ where: { createdAt: { [Op.gte]: today } } }),
    ]);

  const result = {
    status: 'success',
    data: {
      users: { total: totalUsers, today: todayUsers },
      revenue: { total: totalRevenue || 0, today: todayRevenue || 0 },
      tests: { live: liveTests },
      attempts: { total: totalAttempts, today: todayAttempts },
    },
  };

  await redis.setEx(cacheKey, 60, JSON.stringify(result)).catch(() => null);
  res.json(result);
});

// GET /analytics/series/:id  [admin]
exports.getSeriesAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const series = await TestSeries.findByPk(id, {
    include: [{ model: Test, attributes: ['id', 'title', 'test_number', 'status'] }],
  });
  if (!series) throw new AppError('Series not found', 404);

  const testIds = series.Tests.map(t => t.id);

  const [totalPurchases, revenue, totalAttempts, completionRate] = await Promise.all([
    StudentPurchase.count({ where: { series_id: id, payment_status: 'success' } }),
    StudentPurchase.sum('amount_paid', { where: { series_id: id, payment_status: 'success' } }),
    TestAttempt.count({ where: { test_id: { [Op.in]: testIds } } }),
    TestAttempt.count({ where: { test_id: { [Op.in]: testIds }, status: 'submitted' } }),
  ]);

  res.json({
    status: 'success',
    data: {
      series: { id: series.id, title: series.title, type: series.type },
      purchases: { total: totalPurchases, revenue: revenue || 0 },
      attempts: { total: totalAttempts, completed: completionRate },
      tests: series.Tests,
    },
  });
});
