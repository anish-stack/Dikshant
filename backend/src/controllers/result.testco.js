const { asyncHandler } = require('../utils/NewHelpers');
const {
  TestAttemptDikshant,
  AttemptAnswerDikshant,
  QuestionDikshant,
  QuestionOptionDikshant,
  TestDikshant
} = require('../models');

exports.getResult = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!id) {
      return res.status(400).json({ message: "attemptId is required" });
    }

    /* =========================================
       FETCH DATA
    ========================================= */
    const attempt = await TestAttemptDikshant.findOne({
      where: { id, user_id: userId },
      include: [
        {
          model: TestDikshant,
          as: 'test',
          attributes: ['id', 'title', 'total_questions', 'total_marks'],
          include: [
            {
              model: QuestionDikshant,
              as: 'questions',
              attributes: [
                'id',
                'question_text',
                'correct_option',
                'marks',
                'explanation',
                'explanation_html',
                'source',
                'video_url',
                'article_url'
              ],
              include: [
                {
                  model: QuestionOptionDikshant,
                  as: 'options',
                  attributes: [
                    'id',
                    'option_number',
                    'option_label',
                    'option_text'
                  ],
                  separate: true,
                  order: [['option_number', 'ASC']]
                }
              ]
            }
          ]
        },
        {
          model: AttemptAnswerDikshant,
          as: 'answers',
          attributes: ['question_id', 'selected_option', 'is_correct', 'marks_awarded']
        }
      ]
    });

    if (!attempt || !attempt.test) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    const questions = attempt.test.questions || [];
    const answers = attempt.answers || [];

    /* =========================================
       ANSWER MAP
    ========================================= */
    const answerMap = {};
    answers.forEach(a => {
      if (a?.question_id) answerMap[a.question_id] = a;
    });

    /* =========================================
       RESULT CALCULATION
    ========================================= */
    let correct = 0;
    let wrong = 0;
    let unattempted = 0;
    let totalMarks = 0;

    const resultQuestions = questions.map(q => {
      const ans = answerMap[q.id];

      let status = "unattempted";

      if (ans) {
        if (ans.is_correct === true) {
          correct++;
          status = "correct";
        } else if (ans.is_correct === false) {
          wrong++;
          status = "wrong";
        } else {
          unattempted++;
        }
        totalMarks += Number(ans.marks_awarded || 0);
      } else {
        unattempted++;
      }

      const options = (q.options || []).map(opt => ({
        id: opt.id,
        number: opt.option_number,
        label: opt.option_label || null,
        text: opt.option_text || "",
        is_correct: opt.option_number === q.correct_option,
        is_selected: ans?.selected_option === opt.option_number
      }));

      const extra = {};
      if (q.explanation) extra.explanation = q.explanation;
      if (q.explanation_html) extra.explanation_html = q.explanation_html;
      if (q.source) extra.source = q.source;
      if (q.video_url) extra.video_url = q.video_url;
      if (q.article_url) extra.article_url = q.article_url;

      return {
        question_id: q.id,
        question: q.question_text || "",
        options,
        correct_option: q.correct_option,
        selected_option: ans?.selected_option ?? null,
        status,
        marks_awarded: ans?.marks_awarded ?? 0,
        max_marks: q.marks ?? 0,
        ...extra
      };
    });

    /* =========================================
       PERFORMANCE SUMMARY
    ========================================= */
    const totalQuestions = questions.length;
    const attempted = correct + wrong;

    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;
    const attemptRate = totalQuestions > 0 ? (attempted / totalQuestions) * 100 : 0;
    const scorePercent =
      attempt.test.total_marks > 0
        ? (totalMarks / attempt.test.total_marks) * 100
        : 0;

    const negativeMarks = answers
      .filter(a => a?.marks_awarded < 0)
      .reduce((sum, a) => sum + Math.abs(Number(a.marks_awarded || 0)), 0);

    let remark = "Needs Improvement";
    if (accuracy >= 85) remark = "Excellent";
    else if (accuracy >= 70) remark = "Good";
    else if (accuracy >= 50) remark = "Average";

    const performance_summary = {
      total_questions: totalQuestions,
      attempted,
      correct,
      wrong,
      unattempted,
      accuracy: Number(accuracy.toFixed(2)),
      attempt_rate: Number(attemptRate.toFixed(2)),
      score_percent: Number(scorePercent.toFixed(2)),
      negative_marks: Number(negativeMarks.toFixed(2)),
      remark
    };

    /* =========================================
       FINAL RESPONSE
    ========================================= */
    return res.status(200).json({
      success: true,
      data: {
        attempt_id: attempt.id,
        test_id: attempt.test.id,
        test_title: attempt.test.title || "",

        score: Number(totalMarks.toFixed(2)),
        percentile: attempt.percentile ?? null,
        rank: attempt.rank ?? null,

        performance_summary,
        questions: resultQuestions
      }
    });

  } catch (error) {
    console.error("❌ getResult ERROR:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});


exports.getAllAttempts = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { testId } = req.params; // or req.query

    /* =========================================
       FETCH ALL ATTEMPTS OF USER
    ========================================= */
    const attempts = await TestAttemptDikshant.findAll({
      where: { user_id: userId ,test_id:testId },
      include: [
        {
          model: TestDikshant,
          as: 'test',
          attributes: [
            'id',
            'title',
            'total_questions',
            'total_marks'
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    /* =========================================
       FORMAT RESPONSE
    ========================================= */
    const result = attempts.map(attempt => {
      const isSubmitted = attempt.status === 'submitted';
      const isInProgress = attempt.status === 'in_progress';

      return {
        attempt_id: attempt.id,

        test_id: attempt.test?.id,
        test_title: attempt.test?.title || "",

        status: attempt.status,

        score: attempt.score ?? null,
        correct: attempt.correct_count ?? 0,
        wrong: attempt.wrong_count ?? 0,
        unattempted: attempt.unattempted_count ?? 0,

        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,

        /* =========================================
           UI FLAGS (IMPORTANT)
        ========================================= */
        can_resume: isInProgress,
        can_view_result: isSubmitted,

        /* optional extras */
        is_timed_out: attempt.status === 'timed_out',
        rank: attempt.rank ?? null,
        percentile: attempt.percentile ?? null
      };
    });

    return res.status(200).json({
      success: true,
      total: result.length,
      data: result
    });

  } catch (error) {
    console.error("❌ getAllAttempts ERROR:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
});