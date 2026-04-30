const { Op } = require('sequelize');
const {
  MainsSubmissionDikshant: MainsSubmission, EvaluatorDikshant: Evaluation, EvaluationDikshant: Evaluator, TestAttemptDikshant: TestAttempt,
  TestDikshant: Test, QuestionDikshant: Question, User, sequelize,
} = require('../models');
const { AppError, asyncHandler, paginate } = require('../utils/NewHelpers');
const uploadToS3 = require('../utils/s3Upload');
const s3GetSignedUrl = require("../utils/s3GetSignedUrl");
const deleteFromS3 = require('../utils/s3Delete');
const { notificationQueue } = require('../queue');

// ─── Student ──────────────────────────────────────────────────────────────────

// POST /mains/submit
exports.submitMainsAnswer = asyncHandler(async (req, res) => {
  const { attempt_id, question_id, answer_text, word_count } = req.body;

  const attempt = await TestAttempt.findOne({
    where: { id: attempt_id, user_id: req.user.id, status: 'in_progress' },
    include: [{ model: Test, attributes: ['scheduled_end', 'type'] }],
  });
  if (!attempt) throw new AppError('Active attempt not found', 404);
  if (attempt.Test.type !== 'mains') throw new AppError('Not a mains test', 400);

  const now = new Date();
  if (now > new Date(attempt.Test.scheduled_end)) {
    throw new AppError('Submission window closed', 400);
  }

  const question = await Question.findOne({ where: { id: question_id, test_id: attempt.test_id } });
  if (!question) throw new AppError('Question not found in this test', 404);

  let pdf_url = null;
  if (req.file) {
    pdf_url = await uploadToS3(req.file, 'mains-submissions');
  }

  if (!answer_text && !pdf_url) throw new AppError('Provide answer text or PDF upload', 400);

  // Upsert submission
  const [submission, created] = await MainsSubmission.findOrCreate({
    where: { attempt_id, question_id },
    defaults: {
      answer_text,
      pdf_url,
      word_count: word_count || 0,
      submitted_at: now,
      status: 'submitted',
    },
  });

  if (!created) {
    await submission.update({ answer_text, pdf_url, word_count, submitted_at: now, status: 'submitted' });
  }

  res.json({ status: 'success', data: { submission_id: submission.id, status: submission.status } });
});

// POST /mains/submit-all  — final submit of mains test
exports.submitMainsTest = asyncHandler(async (req, res) => {
  const { attempt_id } = req.body;

  const attempt = await TestAttempt.findOne({
    where: { id: attempt_id, user_id: req.user.id, status: 'in_progress' },
  });
  if (!attempt) throw new AppError('Active attempt not found', 404);

  await attempt.update({ status: 'submitted', submitted_at: new Date() });

  // Auto-assign to evaluator
  const evaluator = await Evaluator.findOne({ where: { is_active: true }, order: sequelize.random() });

  const submissions = await MainsSubmission.findAll({ where: { attempt_id } });

  if (evaluator && submissions.length) {
    for (const sub of submissions) {
      await Evaluation.create({
        submission_id: sub.id,
        evaluator_id: evaluator.user_id,
        max_marks: 0, // set from question
        status: 'pending',
        assigned_at: new Date(),
      });
      await sub.update({ status: 'assigned' });
    }
    await evaluator.increment('total_evaluated', { by: 0 }); // update after completion
  }

  res.json({ status: 'success', message: 'Test submitted for evaluation' });
});

// GET /mains/my-submissions
exports.getMySubmissions = asyncHandler(async (req, res) => {
  const { test_id, page = 1, limit = 20 } = req.query;

  const attemptWhere = { user_id: req.user.id };
  if (test_id) attemptWhere.test_id = test_id;

  const attempts = await TestAttempt.findAll({
    where: attemptWhere,
    attributes: ['id'],
  });
  const attemptIds = attempts.map(a => a.id);

  const { count, rows } = await MainsSubmission.findAndCountAll({
    where: { attempt_id: { [Op.in]: attemptIds } },
    include: [
      { model: Question, attributes: ['id', 'question_text', 'subject', 'marks'] },
      {
        model: Evaluation,
        attributes: ['marks_awarded', 'max_marks', 'overall_feedback', 'status', 'completed_at'],
        where: { status: 'completed' },
        required: false,
      },
    ],
    order: [['submitted_at', 'DESC']],
    ...paginate(page, limit),
  });

  const enriched = await Promise.all(
    rows.map(async (sub) => {
      const s = sub.toJSON ? sub.toJSON() : sub;

      const tasks = [];

      if (s.pdf_url) {
        tasks.push(
          s3GetSignedUrl(s.pdf_url).then(url => {
            s.pdf_signed_url = url;
          })
        );
      }

      if (s.Evaluation?.checked_pdf_url) {
        tasks.push(
          s3GetSignedUrl(s.Evaluation.checked_pdf_url).then(url => {
            s.Evaluation.checked_pdf_signed_url = url;
          })
        );
      }

      await Promise.all(tasks);

      return s;
    })
  );

  res.json({ status: 'success', data: { submissions: enriched, total: count } });
});

// ─── Evaluator ────────────────────────────────────────────────────────────────

// GET /mains/pending  [evaluator]
exports.getPendingEvaluations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const { count, rows } = await Evaluation.findAndCountAll({
    where: {
      evaluator_id: req.user.id,
      status: { [Op.in]: ['pending', 'in_progress'] },
    },
    include: [{
      model: MainsSubmission,
      include: [
        { model: Question, attributes: ['id', 'question_text', 'subject', 'marks', 'topic'] },
        {
          model: TestAttempt,
          include: [{ model: User, attributes: ['id', 'name', 'email'] }],
        },
      ],
    }],
    order: [['assigned_at', 'ASC']],
    ...paginate(page, limit),
  });

  const enriched = await Promise.all(
    rows.map(async (ev) => {
      const e = ev.toJSON ? ev.toJSON() : ev;

      if (e.MainsSubmission?.pdf_url) {
        e.MainsSubmission.pdf_signed_url =
          await s3GetSignedUrl(e.MainsSubmission.pdf_url);
      }

      return e;
    })
  );

  res.json({ status: 'success', data: { evaluations: enriched, total: count } });
});

// POST /mains/:id/evaluate  [evaluator]
exports.submitEvaluation = asyncHandler(async (req, res) => {
  const { id } = req.params; // evaluation id
  const { marks_awarded, max_marks, inline_comments, overall_feedback } = req.body;

  const evaluation = await Evaluation.findOne({
    where: { id, evaluator_id: req.user.id },
    include: [{ model: MainsSubmission }],
  });
  if (!evaluation) throw new AppError('Evaluation not found or not assigned to you', 404);
  if (evaluation.status === 'completed') throw new AppError('Already evaluated', 400);

  let checked_pdf_url = evaluation.checked_pdf_url;
  if (req.file) checked_pdf_url = await uploadToS3(req.file, 'checked-copies');

  await sequelize.transaction(async (t) => {
    await evaluation.update({
      marks_awarded,
      max_marks,
      inline_comments: inline_comments || [],
      overall_feedback,
      checked_pdf_url,
      status: 'completed',
      completed_at: new Date(),
    }, { transaction: t });

    await evaluation.MainsSubmission.update({ status: 'evaluated' }, { transaction: t });
  });

  // Update evaluator stats
  await Evaluator.update(
    { total_evaluated: sequelize.literal('total_evaluated + 1') },
    { where: { user_id: req.user.id } }
  );

  res.json({ status: 'success', message: 'Evaluation submitted' });
});

// PUT /mains/:id/publish  [admin]
exports.publishResult = asyncHandler(async (req, res) => {
  const { id } = req.params; // evaluation id

  const evaluation = await Evaluation.findByPk(id, {
    include: [{
      model: MainsSubmission,
      include: [{
        model: TestAttempt,
        include: [{ model: User, attributes: ['id', 'name', 'email', 'fcm_token'] }],
      }],
    }],
  });
  if (!evaluation) throw new AppError('Evaluation not found', 404);
  if (evaluation.status !== 'completed') throw new AppError('Evaluation not yet completed', 400);

  await evaluation.MainsSubmission.update({ status: 'published' });

  const user = evaluation.MainsSubmission.TestAttempt.User;

  // Notify student
  await notificationQueue.add('send-notification', {
    user_id: user.id,
    title: 'Mains Result Published!',
    body: `Your answer has been evaluated. Score: ${evaluation.marks_awarded}/${evaluation.max_marks}`,
    type: 'result',
    meta: { evaluation_id: evaluation.id },
  });

  await sendEmail({
    to: user.email,
    subject: 'Your Mains Answer Evaluated — Dikshant IAS',
    template: 'mains-result',
    data: {
      name: user.name,
      marks: evaluation.marks_awarded,
      max_marks: evaluation.max_marks,
      feedback: evaluation.overall_feedback,
    },
  });

  res.json({ status: 'success', message: 'Result published' });
});

// GET /mains/evaluator/stats  [evaluator]
exports.getEvaluatorStats = asyncHandler(async (req, res) => {
  const evaluator = await Evaluator.findOne({ where: { user_id: req.user.id } });
  if (!evaluator) throw new AppError('Not registered as evaluator', 404);

  const pending = await Evaluation.count({
    where: { evaluator_id: req.user.id, status: 'pending' },
  });
  const completed = await Evaluation.count({
    where: { evaluator_id: req.user.id, status: 'completed' },
  });

  res.json({
    status: 'success',
    data: {
      evaluator,
      stats: { pending, completed, total: pending + completed },
    },
  });
});

// ─── Admin Evaluator Management ───────────────────────────────────────────────

// POST /mains/evaluators  [admin]
exports.createEvaluator = asyncHandler(async (req, res) => {
  const { user_id, specialization, max_daily_load } = req.body;

  const user = await User.findByPk(user_id);
  if (!user) throw new AppError('User not found', 404);

  await user.update({ role: 'evaluator' });

  const [evaluator, created] = await Evaluator.findOrCreate({
    where: { user_id },
    defaults: { specialization: specialization || [], max_daily_load: max_daily_load || 10, is_active: true },
  });

  if (!created) await evaluator.update({ specialization, max_daily_load, is_active: true });

  res.status(201).json({ status: 'success', data: { evaluator } });
});

// GET /mains/evaluators  [admin]
exports.listEvaluators = asyncHandler(async (req, res) => {
  const evaluators = await Evaluator.findAll({
    include: [{ model: User, attributes: ['id', 'name', 'email'] }],
    order: [['total_evaluated', 'DESC']],
  });
  res.json({ status: 'success', data: { evaluators } });
});

// PUT /mains/evaluators/:id  [admin]
exports.updateEvaluator = asyncHandler(async (req, res) => {
  const evaluator = await Evaluator.findByPk(req.params.id);
  if (!evaluator) throw new AppError('Evaluator not found', 404);
  const { specialization, max_daily_load, is_active } = req.body;
  await evaluator.update({ specialization, max_daily_load, is_active });
  res.json({ status: 'success', data: { evaluator } });
});

// POST /mains/assign  [admin] — manual assignment
exports.assignEvaluation = asyncHandler(async (req, res) => {
  const { submission_id, evaluator_id } = req.body;

  const submission = await MainsSubmission.findByPk(submission_id);
  if (!submission) throw new AppError('Submission not found', 404);

  const evaluator = await Evaluator.findOne({ where: { user_id: evaluator_id, is_active: true } });
  if (!evaluator) throw new AppError('Evaluator not found or inactive', 404);

  const [evaluation] = await Evaluation.findOrCreate({
    where: { submission_id },
    defaults: {
      evaluator_id,
      status: 'pending',
      assigned_at: new Date(),
    },
  });

  await submission.update({ status: 'assigned' });

  res.json({ status: 'success', data: { evaluation } });
});
