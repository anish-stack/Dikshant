const { QuestionDikshant: Question, QuestionOptionDikshant: QuestionOption, TestDikshant: Test, sequelize, MainsTestPaperDikshant: MainsPaper } = require('../models');
const { AppError, asyncHandler, paginate } = require('../utils/NewHelpers');
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require('../utils/s3Delete');
const { linkCheckQueue } = require('../queue');

exports.listQuestions = async (req, res, next) => {
  try {
    const { test_id, subject, difficulty, page = 1, limit = 50 } = req.query;

    if (!test_id) {
      return res.status(400).json({
        status: "fail",
        message: "test_id required",
      });
    }

    const where = { test_id };

    if (subject) where.subject = subject;
    if (difficulty) where.difficulty = difficulty;

    const { count, rows } = await Question.findAndCountAll({
      where,
      distinct: true,
      col: "id",
      include: [
        {
          model: QuestionOption,
          as: "options",
          separate: true,
          required: false,
          order: [["option_number", "ASC"]],
        },
      ],
      order: [["order_index", "ASC"]],
      ...paginate(page, limit),
    });

    return res.status(200).json({
      status: "success",
      data: {
        questions: rows,
        total: count,
        page: Number(page),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("listQuestions Error:", error);
    next(error);
  }
};


exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findByPk(req.params.id, {
      include: [
        {
          model: QuestionOption,
          as: "options",
          separate: true,
          order: [["option_number", "ASC"]],
        },
      ],
    });

    if (!question) {
      return res.status(404).json({
        status: "fail",
        message: "Question not found",
      });
    }

    return res.status(200).json({
      status: "success",
      data: { question },
    });
  } catch (error) {
    console.error("getQuestion Error:", error);
    return next(error);
  }
};

// POST /questions [admin]
exports.createQuestion = asyncHandler(async (req, res) => {
  const {
    test_id,
    question_text,
    subject,
    topic,
    difficulty,
    correct_option,
    marks,
    explanation,
    explanation_html,
    source,
    video_url,
    article_url,
    order_index,
    options,
  } = req.body;

  console.log("Creating question with data:", req.body);

  const test = await Test.findByPk(test_id);

  if (!test) throw new AppError("Test not found", 404);

  const parsedOptions = Array.isArray(options)
    ? options
    : [];

  if (parsedOptions.length < 2) {
    throw new AppError("Minimum 2 options required", 400);
  }

  if (Number(correct_option) > parsedOptions.length) {
    throw new AppError("correct_option index out of range", 400);
  }

  let question_image = null;

  if (req.files?.question_image?.[0]) {
    question_image = await uploadToS3(
      req.files.question_image[0],
      "questions"
    );
  }

  const maxOrder =
    (await Question.max("order_index", {
      where: { test_id },
    })) || 0;

  const question = await sequelize.transaction(async (t) => {
    const q = await Question.create(
      {
        test_id,
        question_text,
        question_image,
        subject,
        topic,
        difficulty: difficulty || "medium",
        correct_option: Number(correct_option),
        marks: marks || 2,
        explanation,
        explanation_html,
        source,
        video_url,
        article_url,
        order_index: order_index || maxOrder + 1,
      },
      { transaction: t }
    );

    const optionRecords = parsedOptions.map((opt, idx) => ({
      question_id: q.id,
      option_number: idx + 1,
      option_text:
        typeof opt === "string" ? opt : opt.text,
      option_image:
        typeof opt === "object" ? opt.image || null : null,
    }));

    await QuestionOption.bulkCreate(optionRecords, {
      transaction: t,
    });

    return q;
  });

  const created = await Question.findByPk(question.id, {
    include: [
      {
        model: QuestionOption,
        as: "options",
        separate: true,
        order: [["option_number", "ASC"]],
      },
    ],
  });

  if (source || video_url || article_url) {
    await linkCheckQueue.add("check-links", {
      question_id: question.id,
      urls: [source, video_url, article_url].filter(Boolean),
    });
  }

  res.status(201).json({
    status: "success",
    data: { question: created },
  });
});


// PUT /questions/:id [admin]
exports.updateQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findByPk(req.params.id, {
    include: [
      {
        model: Test,
        as: "test",
        attributes: ["status"],
      },
    ],
  });

  if (!question) {
    throw new AppError("Question not found", 404);
  }

  if (question.test?.status === "live") {
    throw new AppError(
      "Cannot edit questions in a live test",
      400
    );
  }

  const {
    question_text,
    subject,
    topic,
    difficulty,
    correct_option,
    marks,
    explanation,
    explanation_html,
    source,
    video_url,
    article_url,
    order_index,
    options,
  } = req.body;

  const parsedOptions = Array.isArray(options)
    ? options
    : [];

  let question_image = question.question_image;

  if (req.files?.question_image?.[0]) {
    if (question.question_image) {
      await deleteFromS3(
        question.question_image
      ).catch(() => null);
    }

    question_image = await uploadToS3(
      req.files.question_image[0],
      "questions"
    );
  }

  await sequelize.transaction(async (t) => {
    await question.update(
      {
        question_text,
        question_image,
        subject,
        topic,
        difficulty,
        correct_option: Number(correct_option),
        marks,
        explanation,
        explanation_html,
        source,
        video_url,
        article_url,
        order_index,
      },
      { transaction: t }
    );

    if (parsedOptions.length > 0) {
      await QuestionOption.destroy({
        where: { question_id: question.id },
        transaction: t,
      });

      const optionRecords = parsedOptions.map(
        (opt, idx) => ({
          question_id: question.id,
          option_number: idx + 1,
          option_text:
            typeof opt === "string"
              ? opt
              : opt.text,
          option_image:
            typeof opt === "object"
              ? opt.image || null
              : null,
        })
      );

      await QuestionOption.bulkCreate(
        optionRecords,
        { transaction: t }
      );
    }
  });

  const updated = await Question.findByPk(question.id, {
    include: [
      {
        model: QuestionOption,
        as: "options",
        separate: true,
        order: [["option_number", "ASC"]],
      },
    ],
  });

  res.json({
    status: "success",
    data: { question: updated },
  });
});

// DELETE /questions/:id [admin]
exports.deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findByPk(req.params.id, {
    include: [
      {
        model: Test,
        as: "test",
        attributes: ["status"],
      },
    ],
  });

  if (!question) {
    throw new AppError("Question not found", 404);
  }

  if (question.test?.status === "live") {
    throw new AppError(
      "Cannot delete from live test",
      400
    );
  }

  if (question.question_image) {
    await deleteFromS3(
      question.question_image
    ).catch(() => null);
  }

  await sequelize.transaction(async (t) => {
    await QuestionOption.destroy({
      where: { question_id: question.id },
      transaction: t,
    });

    await question.destroy({
      transaction: t,
    });
  });

  res.json({
    status: "success",
    message: "Question deleted",
  });
});


// POST /questions/bulk [admin]
exports.bulkCreateQuestions = asyncHandler(async (req, res) => {
  const { test_id, questions } = req.body;

  if (!test_id || !Array.isArray(questions) || !questions.length) {
    throw new AppError(
      "test_id and questions required",
      400
    );
  }

  const test = await Test.findByPk(test_id);

  if (!test) {
    throw new AppError("Test not found", 404);
  }

  if (test.status === "live") {
    throw new AppError(
      "Cannot add to live test",
      400
    );
  }

  const maxOrder =
    (await Question.max("order_index", {
      where: { test_id },
    })) || 0;

  const created = await sequelize.transaction(async (t) => {
    const results = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      const parsedOptions = Array.isArray(q.options)
        ? q.options
        : [];

      const question = await Question.create(
        {
          test_id,
          question_text: q.question_text,
          subject: q.subject,
          topic: q.topic,
          difficulty: q.difficulty || "medium",
          correct_option: Number(q.correct_option),
          marks: q.marks || 2,
          explanation: q.explanation,
          source: q.source,
          video_url: q.video_url,
          article_url: q.article_url,
          order_index: maxOrder + i + 1,
        },
        { transaction: t }
      );

      if (parsedOptions.length > 0) {
        await QuestionOption.bulkCreate(
          parsedOptions.map((opt, idx) => ({
            question_id: question.id,
            option_number: idx + 1,
            option_text:
              typeof opt === "string"
                ? opt
                : opt.text,
            option_image:
              typeof opt === "object"
                ? opt.image || null
                : null,
          })),
          { transaction: t }
        );
      }

      results.push(question.id);
    }

    return results;
  });

  res.status(201).json({
    status: "success",
    data: {
      created_count: created.length,
      question_ids: created,
    },
  });
});


// POST /questions/:id/check-links [admin]
exports.checkLinks = asyncHandler(async (req, res) => {
  const question = await Question.findByPk(
    req.params.id,
    {
      attributes: [
        "id",
        "source",
        "video_url",
        "article_url",
      ],
    }
  );

  if (!question) {
    throw new AppError("Question not found", 404);
  }

  const urls = [
    question.source,
    question.video_url,
    question.article_url,
  ].filter(Boolean);

  if (!urls.length) {
    return res.json({
      status: "success",
      message: "No URLs to check",
    });
  }

  const job = await linkCheckQueue.add(
    "check-links",
    {
      question_id: question.id,
      urls,
    }
  );

  res.json({
    status: "success",
    message: "Link check queued",
    job_id: job.id,
  });
});


// POST /questions/reorder [admin]
exports.reorderQuestions = asyncHandler(async (req, res) => {
  const { test_id, order } = req.body;

  if (!test_id || !Array.isArray(order) || !order.length) {
    throw new AppError(
      "test_id and order required",
      400
    );
  }

  await sequelize.transaction(async (t) => {
    for (const item of order) {
      await Question.update(
        {
          order_index: item.order_index,
        },
        {
          where: {
            id:
              item.question_id || item.id,
            test_id,
          },
          transaction: t,
        }
      );
    }
  });

  res.json({
    status: "success",
    message: "Questions reordered",
  });
});





exports.createMainsPaper = asyncHandler(async (req, res) => {
  const {
    test_id,
    paper_title,
    instructions,
    duration_minutes,
    total_questions,
    total_marks,
    submission_type,
    publish_at,
    start_at,
    end_at,
  } = req.body;

  const test = await Test.findByPk(test_id);
  if (!test) throw new AppError("Test not found", 404);

  if (test.type !== "mains") {
    throw new AppError("This test is not a mains type", 400);
  }

  if (!req.files?.question_pdf?.[0]) {
    throw new AppError("Question PDF required", 400);
  }

  const question_pdf_url = await uploadToS3(
    req.files.question_pdf[0],
    "mains/question-papers"
  );

  let model_answer_pdf_url = null;

  if (req.files?.model_answer_pdf?.[0]) {
    model_answer_pdf_url = await uploadToS3(
      req.files.model_answer_pdf[0],
      "mains/model-answers"
    );
  }

  const paper = await MainsPaper.create({
    test_id,
    paper_title,
    question_pdf_url,
    model_answer_pdf_url,
    instructions,
    duration_minutes: duration_minutes || 180,
    total_questions,
    total_marks,
    submission_type: submission_type || "pdf",
    publish_at,
    start_at,
    end_at,
    paper_status: "draft",
  });

  res.status(201).json({
    status: "success",
    data: { paper },
  });
});

exports.getMainsPaper = asyncHandler(async (req, res) => {
  const { test_id } = req.params;

  const paper = await MainsPaper.findOne({
    where: { test_id },
  });

  if (!paper) throw new AppError("Create First Paper", 201);

  res.json({
    status: "success",
    data: { paper },
  });
});


exports.updateMainsPaper = asyncHandler(async (req, res) => {
  const paper = await MainsPaper.findByPk(req.params.id);

  if (!paper) throw new AppError("Create First Paper", 201);

  let question_pdf_url = paper.question_pdf_url;
  let model_answer_pdf_url = paper.model_answer_pdf_url;

  if (req.files?.question_pdf?.[0]) {
    if (paper.question_pdf_url) {
      await deleteFromS3(paper.question_pdf_url).catch(() => null);
    }

    question_pdf_url = await uploadToS3(
      req.files.question_pdf[0],
      "mains/question-papers"
    );
  }

  if (req.files?.model_answer_pdf?.[0]) {
    if (paper.model_answer_pdf_url) {
      await deleteFromS3(paper.model_answer_pdf_url).catch(() => null);
    }

    model_answer_pdf_url = await uploadToS3(
      req.files.model_answer_pdf[0],
      "mains/model-answers"
    );
  }

  await paper.update({
    ...req.body,
    question_pdf_url,
    model_answer_pdf_url,
  });

  res.json({
    status: "success",
    data: { paper },
  });
});

exports.deleteMainsPaper = asyncHandler(async (req, res) => {
  const paper = await MainsPaper.findByPk(req.params.id);

  if (!paper) throw new AppError("Paper not found", 404);

  if (paper.question_pdf_url) {
    await deleteFromS3(paper.question_pdf_url).catch(() => null);
  }

  if (paper.model_answer_pdf_url) {
    await deleteFromS3(paper.model_answer_pdf_url).catch(() => null);
  }

  await paper.destroy();

  res.json({
    status: "success",
    message: "Paper deleted",
  });
});

exports.updatePaperStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  console.log("Updating paper status to:", status);

  const paper = await MainsPaper.findByPk(req.params.id);

  if (!paper) throw new AppError("Create First Paper", 201);

  await paper.update({
    paper_status: status,
  });

  res.json({
    status: "success",
    message: "Status updated",
    data: { paper },
  });
});