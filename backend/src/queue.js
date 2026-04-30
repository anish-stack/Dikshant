const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.BULL_REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ─── Queues ───────────────────────────────────────────────────────────────────

const rankCalculationQueue = new Queue('rank-calculation', { connection });
const notificationQueue = new Queue('notifications', { connection });
const linkCheckQueue = new Queue('link-check', { connection });

// ─── Workers ─────────────────────────────────────────────────────────────────

// Rank Calculation Worker
const rankWorker = new Worker('rank-calculation', async (job) => {
  const { test_id, attempt_id } = job.data;

  if (job.name === 'auto-submit') {
    // Handle auto-submit for timed-out attempts
    const { TestAttempt, AttemptAnswer, Question } = require('../models');
    const attempt = await TestAttempt.findByPk(attempt_id, { include: [{ model: require('../models').Test }] });
    if (!attempt || attempt.status !== 'timed_out') return;

    const savedAnswers = await require('../config/redis').redisClient.get(`attempt:${attempt_id}:answers`).catch(() => null);
    const answers = savedAnswers ? JSON.parse(savedAnswers) : [];

    // Score from saved answers
    const questions = await Question.findAll({ where: { test_id: attempt.test_id } });
    let score = 0, correct = 0, wrong = 0, unattempted = 0;
    const answerRecords = [];

    for (const q of questions) {
      const ans = answers.find(a => a.question_id === q.id);
      if (!ans || ans.selected_option == null) {
        unattempted++;
        answerRecords.push({ attempt_id, question_id: q.id, selected_option: null, is_correct: null, marks_awarded: 0, is_marked_review: false, time_spent_seconds: 0 });
      } else if (ans.selected_option === q.correct_option) {
        correct++;
        score += parseFloat(q.marks);
        answerRecords.push({ attempt_id, question_id: q.id, selected_option: ans.selected_option, is_correct: true, marks_awarded: parseFloat(q.marks), is_marked_review: false, time_spent_seconds: 0 });
      } else {
        wrong++;
        const deduction = (attempt.Test?.negative_marking || 0) * parseFloat(q.marks);
        score -= deduction;
        answerRecords.push({ attempt_id, question_id: q.id, selected_option: ans.selected_option, is_correct: false, marks_awarded: -deduction, is_marked_review: false, time_spent_seconds: 0 });
      }
    }

    await attempt.update({ score: Math.max(0, score), correct_count: correct, wrong_count: wrong, unattempted_count: unattempted });
    await AttemptAnswer.bulkCreate(answerRecords, { ignoreDuplicates: true });
  }

  if (job.name === 'calculate-ranks') {
    // Calculate ranks for all submitted attempts in a test
    const { TestAttempt, Ranking, Question, AttemptAnswer, sequelize } = require('../models');

    const attempts = await TestAttempt.findAll({
      where: { test_id, status: { [require('sequelize').Op.in]: ['submitted', 'timed_out'] } },
      order: [['score', 'DESC'], ['submitted_at', 'ASC']],
    });

    if (!attempts.length) return;

    const total = attempts.length;

    // Calculate subject scores per attempt
    const questions = await Question.findAll({ where: { test_id }, attributes: ['id', 'subject'] });
    const questionSubjectMap = {};
    questions.forEach(q => { questionSubjectMap[q.id] = q.subject; });

    await sequelize.transaction(async (t) => {
      for (let i = 0; i < attempts.length; i++) {
        const attempt = attempts[i];
        const rank = i + 1;
        const percentile = parseFloat(((total - rank) / total * 100).toFixed(2));

        // Subject scores
        const answers = await AttemptAnswer.findAll({
          where: { attempt_id: attempt.id, is_correct: true },
          attributes: ['question_id', 'marks_awarded'],
        });

        const subjectScores = {};
        for (const ans of answers) {
          const subj = questionSubjectMap[ans.question_id] || 'Unknown';
          subjectScores[subj] = (subjectScores[subj] || 0) + parseFloat(ans.marks_awarded);
        }

        await attempt.update({ rank, percentile }, { transaction: t });

        await Ranking.upsert({
          test_id,
          user_id: attempt.user_id,
          attempt_id: attempt.id,
          score: attempt.score,
          rank,
          percentile,
          subject_scores: subjectScores,
        }, { transaction: t });
      }
    });

    // Update test status to result_published
    await require('../models').Test.update({ status: 'result_published' }, { where: { id: test_id, status: 'closed' } });

    // Invalidate leaderboard cache
    await require('../config/redis').redisClient.del(`leaderboard:${test_id}`).catch(() => null);

    // Notify all participants
    for (const attempt of attempts) {
      await notificationQueue.add('send-push', {
        user_id: attempt.user_id,
        title: 'Results Published!',
        body: `Your rank: ${attempt.rank} | Percentile: ${attempt.percentile}%`,
        type: 'result',
        meta: { test_id },
      });
    }

    console.log(`Ranks calculated for test ${test_id}: ${total} attempts`);
  }
}, { connection, concurrency: 2 });

// Notification Worker
const notificationWorker = new Worker('notifications', async (job) => {
  const { sendPushNotification } = require('../services/push.service');
  const { sendEmail } = require('../services/email.service');
  const { Notification, User } = require('../models');

  if (job.name === 'send-push') {
    const { user_id, title, body, notification_id, meta } = job.data;
    const user = await User.findByPk(user_id, { attributes: ['fcm_token'] });
    if (user?.fcm_token) {
      await sendPushNotification(user.fcm_token, title, body, meta);
    }
    if (notification_id) {
      await Notification.update({ sent_at: new Date() }, { where: { id: notification_id } });
    }
  }

  if (job.name === 'send-broadcast') {
    const { title, body } = job.data;
    const users = await User.findAll({
      where: { role: 'student', fcm_token: { [require('sequelize').Op.ne]: null } },
      attributes: ['id', 'fcm_token'],
    });

    const { sendMulticastPush } = require('../services/push.service');
    const tokens = users.map(u => u.fcm_token).filter(Boolean);
    if (tokens.length) await sendMulticastPush(tokens, title, body);
  }

  if (job.name === 'send-notification') {
    const { user_id, title, body, type, meta } = job.data;
    const user = await User.findByPk(user_id, { attributes: ['email', 'name', 'fcm_token'] });

    await Notification.create({ user_id, title, body, type, meta, sent_at: new Date() });
    if (user?.fcm_token) {
      await sendPushNotification(user.fcm_token, title, body, meta);
    }
  }
}, { connection, concurrency: 10 });

// Link Check Worker
const linkCheckWorker = new Worker('link-check', async (job) => {
  const axios = require('axios');
  const { Question } = require('../models');
  const { question_id, urls } = job.data;

  const results = await Promise.allSettled(
    urls.map(url => axios.head(url, { timeout: 5000 }))
  );

  const brokenUrls = urls.filter((_, i) => {
    const r = results[i];
    return r.status === 'rejected' || r.value?.status >= 400;
  });

  if (brokenUrls.length) {
    console.warn(`[LinkCheck] Broken URLs for question ${question_id}:`, brokenUrls);
    // Could store in a broken_links table or notify admin
  }
}, { connection, concurrency: 5 });

// Error handlers
rankWorker.on('error', err => console.error('[RankWorker]', err));
notificationWorker.on('error', err => console.error('[NotifWorker]', err));
linkCheckWorker.on('error', err => console.error('[LinkCheckWorker]', err));

module.exports = { rankCalculationQueue, notificationQueue, linkCheckQueue };