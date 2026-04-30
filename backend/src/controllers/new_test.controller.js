const { Op, where } = require('sequelize');
const { TestSeriesDikshant: TestSeries, TestDikshant: Test, StudentPurchaseDikshant: StudentPurchase, User, sequelize, QuestionDikshant: Question, AttemptAnswerDikshant: AttemptAnswer, QuestionOption: QuestionOptionDikshant, TestAttemptDikshant: TestAttempt, RankingDikshant: Ranking } = require('../models');

const redis = require("../config/redis");

const { rankCalculationQueue } = require('../queue');
const { AppError, asyncHandler, paginate } = require('../utils/NewHelpers');
const uploadToS3 = require('../utils/s3Upload');
const TestAttemptDikshant = require('../models/TestAttemptDikshant');

const db = require('../models');
const {
  MainsTestPaperDikshant,
  MainsAnswerSubmissionDikshant   // ← This is the correct name
} = db;
// ─── Helpers ──────────────────────────────────────────────────────────────────

const checkTestAccess = async (userId, test) => {
  if (test.is_free || !userId) return test.is_free;

  // Check series purchase
  const seriesPurchase = await StudentPurchase.findOne({
    where: { user_id: userId, series_id: test.series_id, payment_status: 'success' },
  });
  if (seriesPurchase) return true;

  // Check single test purchase
  const testPurchase = await StudentPurchase.findOne({
    where: { user_id: userId, test_id: test.id, payment_status: 'success' },
  });
  return !!testPurchase;
};

// ─── Public / Student ─────────────────────────────────────────────────────────

// GET /tests/:id
exports.getTest = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;

    const test = await Test.findByPk(req.params.id, {
      include: [{
        model: TestSeries,
        as: 'series',
        attributes: ['id', 'title', 'slug', 'type'],
      }],
    });

    if (!test) throw new AppError('Test not found', 404);

    const hasAccess = await checkTestAccess(userId, test);

    /* =========================================
       ATTEMPT INFO
    ========================================= */

    let resume_attempt = null;
    let attempt_count = 0;
    const max_attempts = 5;

    if (userId) {
      // total attempts
      attempt_count = await TestAttempt.count({
        where: {
          user_id: userId,
          test_id: test.id,
        },
      });

      // in-progress attempt
      const attempt = await TestAttempt.findOne({
        where: {
          user_id: userId,
          test_id: test.id,
          status: 'in_progress',
        },
      });

      if (attempt) {
        const now = new Date();
        const timeSpent = Math.floor(
          (now - new Date(attempt.started_at)) / 1000
        );

        const totalSeconds = test.duration_minutes * 60;
        const remaining = Math.max(0, totalSeconds - timeSpent);

        if (remaining > 0) {
          resume_attempt = {
            attempt_id: attempt.id,
            remaining_seconds: remaining,
          };
        } else {
          // 🔥 optional: auto mark timeout
          await attempt.update({
            status: 'timed_out',
            submitted_at: now,
          });
        }
      }
    }

    /* =========================================
       RESPONSE
    ========================================= */

    return res.json({
      status: 'success',
      data: {
        test: {
          id: test.id,
          title: test.title,
          test_number: test.test_number,
          type: test.type,
          status: test.status,
          scheduled_start: test.scheduled_start,
          scheduled_end: test.scheduled_end,
          duration_minutes: test.duration_minutes,
          total_marks: test.total_marks,
          negative_marking: test.negative_marking,
          instructions: test.instructions,
          syllabus_pdf: test.syllabus_pdf,
          series: test.series,
          has_access: hasAccess,

          // 🔥 attempt info
          resume_attempt,
          attempt_count,
          max_attempts,
          attempts_left: Math.max(0, max_attempts - attempt_count),
          can_attempt: attempt_count < max_attempts,
        },
      },
    });

  } catch (error) {
    console.error('getTest Error:', error);

    return res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Failed to fetch test details',
    });
  }
});

// POST /tests/:id/start

exports.startTest = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const now = new Date();
    const MAX_ATTEMPTS = 15;

    // 1. Fetch test
    const test = await Test.findByPk(id);
    if (!test) throw new AppError('Test not found', 404);
    if (test.status !== 'live') throw new AppError('Test is not live', 400);
    if (now < new Date(test.scheduled_start)) throw new AppError('Test has not started yet', 400);
    if (now > new Date(test.scheduled_end)) throw new AppError('Test has already ended', 400);

    const hasAccess = await checkTestAccess(userId, test);
    if (!hasAccess) throw new AppError('You do not have access to this test', 403);

    const totalSeconds = test.duration_minutes * 60;

    // 2. Count completed attempts
    const completedCount = await TestAttempt.count({
      where: {
        user_id: userId,
        test_id: id,
        status: { [Op.in]: ['submitted', 'timed_out'] },
      },
    });

    if (completedCount >= MAX_ATTEMPTS) {
      throw new AppError(`All ${MAX_ATTEMPTS} attempts used`, 400);
    }

    // 3. Find active attempt
    let attempt = await TestAttempt.findOne({
      where: { user_id: userId, test_id: id, status: 'in_progress' },
    });

    let resumed = false;
    let remaining = totalSeconds;
    let savedAnswers = [];

    if (attempt) {
      // Resume path
      const timeSpent = Math.floor((now - new Date(attempt.started_at)) / 1000);
      remaining = Math.max(0, totalSeconds - timeSpent);

      if (remaining <= 0) {
        await attempt.update({ status: 'timed_out', submitted_at: now });
        throw new AppError('Previous attempt timed out. Start new attempt.', 400);
      }

      resumed = true;

      try {
        const cached = await redis.get(`attempt:${attempt.id}:answers`);
        if (cached) savedAnswers = JSON.parse(cached);
      } catch (err) {
        console.error('Redis read error (non-fatal):', err);
      }

    } else {
      // New attempt — wrap in transaction to prevent race
      attempt = await sequelize.transaction(async (t) => {
        // Double-check inside transaction
        const existing = await TestAttempt.findOne({
          where: { user_id: userId, test_id: id, status: 'in_progress' },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (existing) return existing; // another request beat us, reuse it

        return await TestAttempt.create({
          user_id: userId,
          test_id: id,
          started_at: now,
          status: 'in_progress',
          ip_address: req.ip,
        }, { transaction: t });
      });

      // If we got back an existing attempt (race was won by other req), treat as resume
      if (attempt.started_at < now) {
        const timeSpent = Math.floor((now - new Date(attempt.started_at)) / 1000);
        remaining = Math.max(0, totalSeconds - timeSpent);
        resumed = true;
      }
    }

    // 4. Fetch questions (exclude answers)
    const questions = await Question.findAll({
      where: { test_id: id },
      include: [{
        model: sequelize.models.QuestionOptionDikshant,
        as: 'options',
        attributes: ['id', 'option_number', 'option_label', 'option_text', 'option_image'],
      }],
      order: [['order_index', 'ASC']],
      attributes: { exclude: ['correct_option', 'explanation', 'explanation_html'] },
    });

    return res.json({
      status: 'success',
      message: resumed ? 'Test resumed successfully' : 'Test started successfully',
      data: {
        attempt_id: attempt.id,
        remaining_seconds: remaining,
        resumed,
        saved_answers: savedAnswers,
        questions,
        test: {
          id: test.id,
          title: test.title,
          type: test.type,
          duration_minutes: test.duration_minutes,
          total_marks: test.total_marks,
          negative_marking: test.negative_marking,
        },
        attempts: {
          used: completedCount,
          max: MAX_ATTEMPTS,
          left: MAX_ATTEMPTS - completedCount,
        },
      },
    });
  } catch (error) {
    console.log(error)
    return res.status(501).json({
      status: false,
      message: error

    })
  }

});
// POST /tests/:id/autosave
exports.autoSave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attempt_id, answers } = req.body;

  const attempt = await TestAttempt.findOne({
    where: { id: attempt_id, user_id: req.user.id, test_id: id, status: 'in_progress' },
  });

  if (!attempt) throw new AppError('Attempt not found', 404);

  const test = await Test.findByPk(id);

  const now = new Date();
  const timeSpent = Math.floor((now - new Date(attempt.started_at)) / 1000);
  const totalSeconds = test.duration_minutes * 60;

  if (timeSpent > totalSeconds) {
    await attempt.update({ status: 'timed_out', submitted_at: now });
    return res.json({ status: 'success', message: 'Auto submitted' });
  }

  // 🔥 safe save
  await redis.set(`attempt:${attempt_id}:answers`, JSON.stringify(answers), 'EX', 7200);

  res.json({
    status: 'success',
    remaining_seconds: totalSeconds - timeSpent,
  });
});

// ============================================================
// POST /tests/:id/submit  — saves per-question answers to DB
// ============================================================
exports.submitTest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { attempt_id, answers } = req.body;

  if (!Array.isArray(answers)) {
    throw new AppError('Invalid answers format', 400);
  }

  const attempt = await TestAttempt.findOne({
    where: { id: attempt_id, user_id: req.user.id, test_id: id, status: 'in_progress' },
  });
  if (!attempt) throw new AppError('Attempt not found', 404);

  const test = await Test.findByPk(id);
  if (!test) throw new AppError('Test not found', 404);

  const now = new Date();
  const timeSpent = Math.floor((now - new Date(attempt.started_at)) / 1000);
  const totalSeconds = test.duration_minutes * 60;

  if (timeSpent > totalSeconds + 10) {
    await attempt.update({ status: 'timed_out', submitted_at: now, time_spent_seconds: totalSeconds });
    return res.status(400).json({ status: 'error', message: 'Time exceeded. Attempt marked as timed out.' });
  }

  // Fetch questions WITH explanation + hint for result display
  const questions = await Question.findAll({
    where: { test_id: id },
    attributes: ['id', 'correct_option', 'marks', 'subject', 'topic', 'difficulty', 'explanation', 'explanation_html'],
  });

  const answerMap = {};
  answers.forEach(a => { answerMap[a.question_id] = a; });

  let score = 0, correct = 0, wrong = 0, unattempted = 0;
  const answerRows = []; // for DB bulk insert

  for (const q of questions) {
    const ans = answerMap[q.id];
    const selected = ans?.selected_option ?? null;
    let isCorrect = null;
    let marksAwarded = 0;

    if (selected == null) {
      unattempted++;
    } else if (String(selected) === String(q.correct_option)) {
      correct++;
      marksAwarded = parseFloat(q.marks);
      score += marksAwarded;
      isCorrect = true;
    } else {
      wrong++;
      const negative = Math.abs(parseFloat(test.negative_marking || 0));
      marksAwarded = -(negative * parseFloat(q.marks));
      score += marksAwarded;
      isCorrect = false;
    }

    answerRows.push({
      attempt_id,
      question_id: q.id,
      selected_option: selected,
      correct_option: q.correct_option,
      is_correct: isCorrect,
      marks_awarded: parseFloat(marksAwarded.toFixed(2)),
    });
  }

  const finalScore = parseFloat(Math.max(0, score).toFixed(2));
  const actualTimeSpent = Math.min(timeSpent, totalSeconds);

  // Save attempt + answers in transaction
  try {
    await sequelize.transaction(async (t) => {
      await attempt.update({
        submitted_at: now,
        status: 'submitted',
        score: finalScore,
        correct_count: correct,
        wrong_count: wrong,
        unattempted_count: unattempted,
        time_spent_seconds: actualTimeSpent,
      }, { transaction: t });

      // Bulk insert per-question answers (ignore duplicates on re-submit)
      await AttemptAnswer.bulkCreate(answerRows, {
        transaction: t,
        ignoreDuplicates: true,
      });
    });
  } catch (updateErr) {
    console.error('❌ submitTest transaction failed:', {
      message: updateErr.message,
      sqlMessage: updateErr.parent?.sqlMessage,
      attempt_id,
    });
    throw new AppError('Failed to save submission. Please try again.', 500);
  }

  // Clear caches (non-fatal)
  try {
    await redis.del(`attempt:${attempt_id}:answers`);
    await redis.del(`leaderboard:${id}`);
  } catch (redisErr) {
    console.error('Redis cache clear failed (non-fatal):', redisErr.message);
  }

  return res.json({
    status: 'success',
    data: { score: finalScore, correct, wrong, unattempted },
  });
});




// GET /tests/:id/solutions
exports.getSolutions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const test = await Test.findByPk(id, { attributes: ['id', 'status', 'series_id', 'is_free'] });
  if (!test) throw new AppError('Test not found', 404);
  if (!['result_published', 'closed'].includes(test.status)) {
    throw new AppError('Solutions not yet available', 403);
  }

  const attempt = await TestAttempt.findOne({
    where: { user_id: userId, test_id: id, status: { [Op.in]: ['submitted', 'timed_out'] } },
  });
  if (!attempt) throw new AppError('You must attempt the test to view solutions', 403);

  const hasAccess = await checkTestAccess(userId, test);
  if (!hasAccess) throw new AppError('Purchase required to view full solutions', 403);


  const questions = await Question.findAll({
    where: { test_id: id },
    include: [
      { model: QuestionOption },
      {
        model: AttemptAnswer,
        where: { attempt_id: attempt.id },
        required: false,
        attributes: ['selected_option', 'is_correct', 'marks_awarded', 'time_spent_seconds'],
      },
    ],
    order: [['order_index', 'ASC']],
  });

  res.json({ status: 'success', data: { questions } });
});

// GET /tests/:id/leaderboard
exports.getLeaderboard = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 100 } = req.query;

  const cacheKey = `leaderboard:${id}`;
  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));

  const rankings = await Ranking.findAll({
    where: { test_id: id },
    include: [{ model: User, attributes: ['id', 'name', 'avatar_url'] }],
    order: [['rank', 'ASC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  const total = await Ranking.count({ where: { test_id: id } });

  // Get current user's rank if logged in
  let myRanking = null;
  if (req.user) {
    myRanking = await Ranking.findOne({ where: { user_id: req.user.id, test_id: id } });
  }

  const result = {
    status: 'success',
    data: { rankings, total, my_ranking: myRanking },
  };

  await redis.setEx(cacheKey, 60, JSON.stringify(result)).catch(() => null);
  res.json(result);
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// POST /tests  [admin]
exports.createTest = asyncHandler(async (req, res) => {
  const {
    series_id, title, test_number, type, scheduled_start, scheduled_end,
    duration_minutes, total_marks, negative_marking, is_free, instructions,
    status,
  } = req.body;

  const series = await TestSeries.findByPk(series_id);
  if (!series) throw new AppError('Series not found', 404);

  let syllabus_pdf = null;
  if (req.file) syllabus_pdf = await uploadToS3(req.file, 'syllabus');

  const test = await Test.create({
    series_id, title, test_number, type: type || series.type,
    scheduled_start, scheduled_end, duration_minutes, total_marks,
    negative_marking: negative_marking || 0, is_free: is_free || false,
    instructions, syllabus_pdf, status: 'draft',
  });

  // Increment series test count
  await series.increment('total_tests');

  res.status(201).json({ status: 'success', data: { test } });
});

// PUT /tests/:id  [admin]
exports.updateTest = asyncHandler(async (req, res) => {
  const test = await Test.findByPk(req.params.id);
  console.log("res", req.body)
  if (!test) throw new AppError('Test not found', 404);
  // if (test.status === 'live') throw new AppError('Cannot edit a live test', 400);
  const allowed = ['title', "status", "type", 'test_number', 'scheduled_start', 'scheduled_end', 'duration_minutes', 'total_marks', 'negative_marking', 'is_free', 'instructions'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (req.file) updates.syllabus_pdf = await uploadToS3(req.file, 'syllabus');

  await test.update(updates);
  res.json({ status: 'success', data: { test } });
});

// PUT /tests/:id/status  [admin]
exports.updateTestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validTransitions = {
    draft: ['scheduled'],
    scheduled: ['live', 'draft'],
    live: ['closed'],
    closed: ['result_published'],
    result_published: [],
  };

  const test = await Test.findByPk(req.params.id);
  if (!test) throw new AppError('Test not found', 404);

  if (!validTransitions[test.status]?.includes(status)) {
    throw new AppError(`Cannot transition from ${test.status} to ${status}`, 400);
  }

  await test.update({ status });

  if (status === 'closed') {
    await rankCalculationQueue.add('calculate-ranks', { test_id: test.id }, { jobId: `rank-${test.id}` });
  }

  // Invalidate cache
  await redis.del(`leaderboard:${test.id}`).catch(() => null);

  res.json({ status: 'success', data: { test } });
});

// DELETE /tests/:id  [admin]
exports.deleteTest = asyncHandler(async (req, res) => {
  const test = await Test.findByPk(req.params.id);
  if (!test) throw new AppError('Test not found', 404);
  if (test.status === "live") {
    throw new AppError(
      "Cannot delete a live test. Please change the status to draft first.",
      400
    );
  }
  await test.destroy();

  const series = await TestSeries.findByPk(test.series_id);
  if (series) await series.decrement('total_tests');

  res.json({ status: 'success', message: 'Test deleted' });
});

// GET /tests/admin/list  [admin]
// GET /admin/tests
exports.adminListTests = asyncHandler(async (req, res) => {
  try {
    const { series_id, status, type, page = 1, limit = 20 } = req.query;
    console.log("Admin List Tests Query:", req.query); // Debug log
    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 20;

    /* =========================================
       FILTERS
    ========================================= */
    const where = {};

    if (series_id) where.series_id = series_id;
    if (status) where.status = status;
    if (type) where.type = type;

    /* =========================================
       FETCH TESTS
       paranoid auto handles deleted rows
    ========================================= */
    const { count, rows } = await Test.findAndCountAll({
      where,
      include: [
        {
          model: TestSeries,
          as: "series", // must match association alias
          attributes: ["id", "title", "type"],
          required: false,
        },
      ],

      order: [["scheduled_start", "ASC"]],

      offset: (currentPage - 1) * perPage,
      limit: perPage,

      distinct: true,
    });

    /* =========================================
       RESPONSE
    ========================================= */
    return res.json({
      status: "success",
      data: {
        tests: rows,
        total: count,
        page: currentPage,
        limit: perPage,
        total_pages: Math.ceil(count / perPage),
      },
    });
  } catch (error) {
    console.error("adminListTests Error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch tests",
      error: error.message,
    });
  }
});

exports.mainsTestDetails = asyncHandler(async (req, res) => {
    try {
        const userId = req.user?.id;
        const { testId } = req.params;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Unauthorized" 
            });
        }

        if (!testId) {
            return res.status(400).json({ 
                success: false, 
                message: "testId is required" 
            });
        }

        // Get Mains Paper with more useful fields
        const paper = await MainsTestPaperDikshant.findOne({
            where: {
                test_id: testId,
                is_active: true
            },
            attributes: [
                'id', 'test_id', 'paper_title',
                'duration_minutes', 'total_marks', 'total_questions',
                'question_pdf_url', 'model_answer_pdf_url', 'sample_copy_pdf_url',
                'instructions', 'submission_type',
                'paper_status', 'start_at', 'end_at', 'result_publish_at',
                'publish_at'
            ]
        });

        if (!paper) {
            return res.status(404).json({
                success: false,
                message: "Mains test paper not found"
            });
        }

        // Get User's Submission
        const submission = await MainsAnswerSubmissionDikshant.findOne({
            where: {
                user_id: userId,
                paper_id: paper.id
            },
            attributes: [
                'id', 'answer_pdf_url', 'evaluated_pdf_url',
                'marks_obtained', 'status', 'result_status',
                'submitted_at'
            ]
        });

        const now = new Date();

        // ─── Improved Flags Logic ─────────────────────────────────
        const isPublished = ['published', 'live', 'closed', 'result_declared'].includes(paper.paper_status);

        const isLive = paper.paper_status === 'published' &&
            (!paper.start_at || new Date(paper.start_at) <= now) &&
            (!paper.end_at || new Date(paper.end_at) >= now);

        const isClosed = paper.paper_status === 'closed' ||
            (paper.end_at && new Date(paper.end_at) < now);

        const isResultDeclared = 
            paper.paper_status === 'result_declared' ||
            (paper.result_publish_at && new Date(paper.result_publish_at) <= now);

        const hasSubmitted = !!submission;

        // More accurate permission flags
        const canDownloadPaper = isPublished || isLive;
        const canUploadAnswer = isLive && !hasSubmitted;
        const canViewResult = isResultDeclared && hasSubmitted;

        // Calculate time left (in minutes) if live
        let timeLeftMinutes = null;
        if (isLive && paper.end_at) {
            const endTime = new Date(paper.end_at).getTime();
            const currentTime = now.getTime();
            timeLeftMinutes = Math.max(0, Math.floor((endTime - currentTime) / 60000));
        }

        return res.status(200).json({
            success: true,
            data: {
                paper_id: paper.id,
                test_id: paper.test_id,
                paper_title: paper.paper_title,

                duration_minutes: paper.duration_minutes,
                total_marks: paper.total_marks,
                total_questions: paper.total_questions,

                // Files
                question_pdf_url: paper.question_pdf_url,
                model_answer_pdf_url: isResultDeclared ? paper.model_answer_pdf_url : null,
                sample_copy_pdf_url: isResultDeclared ? paper.sample_copy_pdf_url : null,

                // Extra useful fields
                instructions: paper.instructions,
                submission_type: paper.submission_type,
                start_at: paper.start_at,
                end_at: paper.end_at,
                time_left_minutes: timeLeftMinutes,     // New field for frontend countdown

                // Submission Data
                submission: submission ? {
                    id: submission.id,
                    answer_pdf_url: submission.answer_pdf_url,
                    evaluated_pdf_url: submission.evaluated_pdf_url,
                    marks_obtained: submission.marks_obtained,
                    status: submission.status,
                    result_status: submission.result_status,
                    submitted_at: submission.submitted_at,
                } : null,

                // Flags for frontend decision making
                flags: {
                    is_published: isPublished,
                    is_live: isLive,
                    is_closed: isClosed,
                    is_result_declared: isResultDeclared,

                    has_submitted: hasSubmitted,

                    can_download_paper: canDownloadPaper,
                    can_upload_answer: canUploadAnswer,
                    can_view_result: canViewResult,
                }
            }
        });

    } catch (error) {
        console.error("❌ mainsTestDetails ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.getMySubmission = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { paperId } = req.params;

  const submission = await MainsAnswerSubmissionDikshant.findOne({
    where: {
      user_id: userId,
      paper_id: paperId
    }
  });

  return res.json({
    success: true,
    data: submission || null
  });
});

exports.getMyAllSubmissions = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const submissions = await MainsAnswerSubmissionDikshant.findAll({
    where: { user_id: userId },
    order: [['createdAt', 'DESC']]
  });

  return res.json({
    success: true,
    total: submissions.length,
    data: submissions
  });
});

exports.submitMainsAnswer = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const { paperId } = req.params;
    console.log(paperId)

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    /* ===============================
       CHECK ALREADY SUBMITTED
    =============================== */
    const existing = await MainsAnswerSubmissionDikshant.findOne({
      where: { user_id: userId, test_id: paperId }
    });

    if (existing) {
      return res.status(400).json({
        message: "You have already submitted this paper"
      });
    }

    /* ===============================
       UPLOAD TO S3
    =============================== */
    const fileUrl = await uploadToS3(req.file, "mains/answers");

    /* ===============================
       CREATE ENTRY
    =============================== */
    const submission = await MainsAnswerSubmissionDikshant.create({
      user_id: userId,
      paper_id: paperId,
      test_id: paperId, // pass from frontend
      answer_pdf_url: fileUrl,
      status: 'submitted'
    });

    return res.status(201).json({
      success: true,
      message: "Answer sheet uploaded successfully",
      data: submission
    });

  } catch (error) {
    console.error("❌ submitMainsAnswer ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});


exports.startChecking = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await MainsAnswerSubmissionDikshant.findByPk(submissionId);

  if (!submission) {
    return res.status(404).json({ message: "Submission not found" });
  }

  submission.status = 'under_review';
  await submission.save();

  return res.json({
    success: true,
    message: "Marked as under review"
  });
});


exports.checkMainsAnswer = asyncHandler(async (req, res) => {
  try {

    const { submissionId } = req.params;
    const { marks_obtained, total_marks, feedback } = req.body;

    const submission = await MainsAnswerSubmissionDikshant.findByPk(submissionId);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Checked PDF is required" });
    }

    /* ===============================
       UPLOAD CHECKED PDF
    =============================== */
    const checkedPdfUrl = await uploadToS3(req.file, "mains/checked");

    /* ===============================
       CALCULATE RESULT
    =============================== */
    const percentage = (marks_obtained / total_marks) * 100;

    let resultStatus = 'fail';
    if (percentage >= 40) resultStatus = 'pass'; // customizable

    /* ===============================
       UPDATE
    =============================== */
    await submission.update({
      evaluated_pdf_url: checkedPdfUrl,
      marks_obtained,
      total_marks,
      feedback,
      checked_at: new Date(),
      status: 'checked',
      result_status: resultStatus
    });

    return res.json({
      success: true,
      message: "Answer checked successfully",
      data: submission
    });

  } catch (error) {
    console.error("❌ checkMainsAnswer ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

exports.getAllSubmissions = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const where = {};
  if (status) where.status = status;

  const submissions = await MainsAnswerSubmissionDikshant.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });

  return res.json({
    success: true,
    total: submissions.length,
    data: submissions
  });
});

exports.recheckMainsAnswer = asyncHandler(async (req, res) => {
  try {
    const adminId = req.user.id;
    const { submissionId } = req.params;
    const { marks_obtained, total_marks, feedback } = req.body;

    const submission = await MainsAnswerSubmissionDikshant.findByPk(submissionId);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    let checkedPdfUrl = submission.evaluated_pdf_url;

    if (req.file) {
      checkedPdfUrl = await uploadToS3(req.file, "mains/rechecked");
    }

    const percentage = (marks_obtained / total_marks) * 100;
    const resultStatus = percentage >= 40 ? 'pass' : 'fail';

    await submission.update({
      evaluated_pdf_url: checkedPdfUrl,
      marks_obtained,
      total_marks,
      feedback,
      checked_by: adminId,
      checked_at: new Date(),
      result_status: resultStatus,
      status: 'checked'
    });

    return res.json({
      success: true,
      message: "Re-evaluated successfully",
      data: submission
    });

  } catch (error) {
    console.error("❌ recheck ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});