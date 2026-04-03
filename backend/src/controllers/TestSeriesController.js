'use strict';

const { TestSeries, Sequelize, sequelize, StudentAnswerSubmission, Order, User } = require('../models');
const redis = require('../config/redis');
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require('../utils/s3Delete');
const { generateSlug } = require('../utils/helpers');
const PositionService = require('../utils/position.service');
const { Op } = Sequelize;
class TestSeriesController {

  /* -------------------- CREATE -------------------- */
  static async create(req, res) {
    try {
      const {
        title,
        displayOrder = 0,
        status = "new",
        isActive = true,
        description,
        price = 0,
        discountPrice = 0,
        gst = 0,
        testStartDate,
        testStartTime,
        AnswerSubmitDateAndTime,
        AnswerLastSubmitDateAndTime,
        timeDurationForTest,
        passing_marks,
        expirSeries,
      } = req.body;

      // ── Status validation (match ENUM in model) ──
      const allowedStatuses = ['new', 'normal', 'popular', 'featured'];
      const normalizedStatus = (status || 'new').trim().toLowerCase();

      if (!allowedStatuses.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status value. Allowed: ${allowedStatuses.join(', ')}`,
        });
      }

      // ── Basic input validations ──
      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title is required",
        });
      }

      if (Number(discountPrice) > Number(price)) {
        return res.status(400).json({
          success: false,
          message: "Discount price cannot be greater than original price",
        });
      }

      if (Number(gst) < 0) {
        return res.status(400).json({
          success: false,
          message: "GST cannot be negative",
        });
      }

      if (timeDurationForTest && Number(timeDurationForTest) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Test duration must be greater than 0 minutes",
        });
      }

      // ── Safe date parser (handles empty, invalid, 'Invalid date', etc.) ──
      const safeDate = (value) => {
        if (!value || value === 'Invalid date' || String(value).trim() === '') {
          return null;
        }
        const date = new Date(value);
        // Also accept common formats from frontend (date + time-local)
        return isNaN(date.getTime()) ? null : date;
      };

      // Parse ALL date/time fields consistently
      const parsedTestStartDate = safeDate(testStartDate);
      const parsedTestStartTime = safeDate(testStartTime);
      const parsedAnswerSubmitStart = safeDate(AnswerSubmitDateAndTime);
      const parsedAnswerSubmitLast = safeDate(AnswerLastSubmitDateAndTime);
      const parsedExpiry = safeDate(expirSeries);

      // ── Logical date validations ──
      if (parsedAnswerSubmitStart && parsedAnswerSubmitLast &&
        parsedAnswerSubmitLast < parsedAnswerSubmitStart) {
        return res.status(400).json({
          success: false,
          message: "Last answer submission time must be after start submission time",
        });
      }

      if (parsedExpiry && parsedTestStartDate && parsedExpiry < parsedTestStartDate) {
        return res.status(400).json({
          success: false,
          message: "Expiry date cannot be before test start date",
        });
      }

      // ── Handle image upload ──
      let imageUrl = null;
      if (req.file) {
        imageUrl = await uploadToS3(req.file, "testseries");
      }
      let position = await PositionService.insert(TestSeries,"displayOrder", req.body.displayOrder)

      // ── Create the record ──
      const item = await TestSeries.create({
        imageUrl,
        title: title.trim(),
        slug: generateSlug(title),
        displayOrder: Number(position) || 0,
        status: normalizedStatus,
        isActive: Boolean(isActive),
        description: description?.trim() || null,
        price: Number(price) || 0,
        discountPrice: Number(discountPrice) || 0,
        gst: Number(gst) || 0,

        // All date fields are now safely parsed (null if invalid/empty)
        testStartDate: parsedTestStartDate,
        testStartTime: parsedTestStartTime,
        AnswerSubmitDateAndTime: parsedAnswerSubmitStart,
        AnswerLastSubmitDateAndTime: parsedAnswerSubmitLast,
        expirSeries: parsedExpiry,

        timeDurationForTest: timeDurationForTest ? Number(timeDurationForTest) : null,
        passing_marks: passing_marks ? Number(passing_marks) : null,
      });

      // ── Clear cache ──
      await redis.del("testseries");

      return res.status(201).json({
        success: true,
        message: "Test series created successfully",
        data: item,
      });

    } catch (error) {
      console.error("TestSeries create error:", error);

      let message = "Failed to create test series. Please try again later.";
      let statusCode = 500;

      if (error.name === 'SequelizeDatabaseError') {
        const sqlMsg = error.parent?.sqlMessage || '';

        if (sqlMsg.includes('Data truncated for column \'status\'')) {
          message = "Invalid status value. Please use one of: new, normal, popular, featured";
          statusCode = 400;
        }
        else if (sqlMsg.includes('Incorrect datetime value') || sqlMsg.includes('Invalid date')) {
          message = "One or more date/time fields contain invalid values. Please use correct format (YYYY-MM-DD or YYYY-MM-DDTHH:mm).";
          statusCode = 400;
        }
        else if (sqlMsg.includes('Data too long')) {
          message = "Some field is too long (title, description, etc.). Please shorten it.";
          statusCode = 400;
        }
      }
      else if (error.name === 'SequelizeValidationError') {
        message = error.errors?.map(e => e.message).join(", ") || "Validation failed";
        statusCode = 400;
      }

      return res.status(statusCode).json({
        success: false,
        message,
        // error: error.message,   // keep only during development
      });
    }
  }

  /* -------------------- ADMIN: UPLOAD QUESTION SHEET -------------------- */
  static async uploadQuestionSheet(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id: testSeriesId } = req.params;

      const testSeries = await TestSeries.findByPk(testSeriesId, { transaction });
      if (!testSeries) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Test series not found"
        });
      }

      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Question sheet file is required"
        });
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Only PDF, JPEG, PNG, and WebP files are allowed"
        });
      }

      let questionPdfUrl;

      // Delete old question sheet if exists
      if (testSeries.questionPdf) {
        await deleteFromS3(testSeries.questionPdf);
      }

      // Upload new file
      const folderPath = `testseries/${testSeriesId}/question-sheet`;
      questionPdfUrl = await uploadToS3(req.file, folderPath);

      // Update database
      await testSeries.update({ questionPdf: questionPdfUrl }, { transaction });

      await transaction.commit();

      // Invalidate cache
      await redis.del("testseries");
      await redis.del(`testseries:${testSeriesId}`);

      return res.status(200).json({
        success: true,
        message: "Question sheet uploaded successfully!",
        data: {
          questionPdfUrl
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error("Error uploading question sheet:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload question sheet",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  /* -------------------- ADMIN: UPLOAD OFFICIAL ANSWER KEY -------------------- */
  static async uploadMainAnswerKeySheet(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { id: testSeriesId } = req.params;

      const testSeries = await TestSeries.findByPk(testSeriesId, { transaction });
      if (!testSeries) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Test series not found"
        });
      }

      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Answer key file is required"
        });
      }

      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Only PDF, JPEG, PNG, and WebP files are allowed"
        });
      }

      let answerKeyUrl;

      // Delete old answer key if exists
      if (testSeries.answerkey) {
        await deleteFromS3(testSeries.answerkey);
      }

      // Upload new answer key
      const folderPath = `testseries/${testSeriesId}/answer-key`;
      answerKeyUrl = await uploadToS3(req.file, folderPath);

      // Update database
      await testSeries.update({ answerkey: answerKeyUrl }, { transaction });

      await transaction.commit();

      // Invalidate cache
      await redis.del("testseries");
      await redis.del(`testseries:${testSeriesId}`);

      return res.status(200).json({
        success: true,
        message: "Official answer key uploaded successfully!",
        data: {
          answerKeyUrl
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error("Error uploading answer key:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to upload answer key",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }


  /* -------------------- STUDENT: UPLOAD ANSWER SHEET STUDENT -------------------- */
  static async uploadStudentAnswerSheet(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id: testSeriesId } = req.params;
      const userId = req.user.id;

      /* ---------- Validate Test Series ---------- */
      const testSeries = await TestSeries.findByPk(testSeriesId);
      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      if (!testSeries.isActive) {
        return res.status(400).json({
          success: false,
          message: "This test series is currently inactive",
        });
      }

      /* ---------- Validate Files ---------- */
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one answer sheet file is required",
        });
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ];

      for (const file of req.files) {
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: "Only PDF, JPEG, PNG, and WebP files are allowed",
          });
        }
      }

      /* ---------- Time Validation ---------- */
      const now = new Date();
      const submitStart = testSeries.AnswerSubmitDateAndTime
        ? new Date(testSeries.AnswerSubmitDateAndTime)
        : null;
      const submitEnd = testSeries.AnswerLastSubmitDateAndTime
        ? new Date(testSeries.AnswerLastSubmitDateAndTime)
        : null;

      if (submitStart && now < submitStart) {
        return res.status(400).json({
          success: false,
          message: `Submission window opens at ${submitStart.toLocaleString()}`,
        });
      }

      if (submitEnd && now > submitEnd) {
        return res.status(400).json({
          success: false,
          message: `Submission deadline passed on ${submitEnd.toLocaleString()}`,
        });
      }

      const isLate = submitEnd ? now > submitEnd : false;

      /* ---------- Prevent Duplicate Submission ---------- */
      const existing = await StudentAnswerSubmission.findOne({
        where: { testSeriesId, userId },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message:
            "You have already submitted your answer sheet for this test series",
        });
      }

      /* ---------- Upload Files to S3 ---------- */
      const folderPath = `testseries/${testSeriesId}/submissions/${userId}`;

      const uploadedUrls = [];

      for (const file of req.files) {
        const url = await uploadToS3(file, folderPath);
        uploadedUrls.push(url);
      }

      /* ---------- Save Submission ---------- */
      const submission = await StudentAnswerSubmission.create(
        {
          testSeriesId,
          userId,
          answerSheetUrls: uploadedUrls, // ✅ array
          submittedAt: now,
          isLate,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: isLate
          ? "Answer sheets submitted successfully (marked as late)"
          : "Answer sheets submitted successfully!",
        data: {
          submissionId: submission.id,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
          answerSheetUrls: uploadedUrls,
          totalFiles: uploadedUrls.length,
        },
      });
    } catch (error) {
      await transaction.rollback();
      console.error("Error submitting answer sheets:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to submit answer sheets. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /* -------------------- GET ALL -------------------- */
  static async findAll(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        minPrice,
        maxPrice,
        status,
        isActive,
        sortBy = "displayOrder",
        sortOrder = "ASC",
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      /* ================= FILTER CONDITIONS ================= */
      const where = {};

      // 🔍 Search
      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }

      // 💰 Price filter
      if (minPrice || maxPrice) {
        where.discountPrice = {};
        if (minPrice) where.discountPrice[Op.gte] = Number(minPrice);
        if (maxPrice) where.discountPrice[Op.lte] = Number(maxPrice);
      }

      // ⭐ Status
      if (status) where.status = status;

      // ✅ Active
      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      /* ================= QUERY WITH STATS ================= */
      const { rows, count } = await TestSeries.findAndCountAll({
        where,
        attributes: {
          include: [
            // 🧾 Total Purchases
            [
              Sequelize.literal(`(
              SELECT COUNT(*)
              FROM orders AS o
              WHERE o.itemId = TestSeries.id
                AND o.type = 'test'
                AND o.status = 'success'
                AND o.enrollmentStatus = 'active'
            )`),
              "totalPurchases",
            ],

            // 📝 Total Answer Submissions
            [
              Sequelize.literal(`(
              SELECT COUNT(*)
              FROM StudentAnswerSubmissions AS s
              WHERE s.testSeriesId = TestSeries.id
            )`),
              "totalSubmissions",
            ],

            // 📊 Submission Rate (%)
            [
              Sequelize.literal(`(
              CASE
                WHEN (
                  SELECT COUNT(*)
                  FROM orders AS o
                  WHERE o.itemId = TestSeries.id
                    AND o.type = 'test'
                    AND o.status = 'success'
                    AND o.enrollmentStatus = 'active'
                ) = 0
                THEN 0
                ELSE ROUND(
                  (
                    (
                      SELECT COUNT(*)
                      FROM StudentAnswerSubmissions AS s
                      WHERE s.testSeriesId = TestSeries.id
                    ) /
                    (
                      SELECT COUNT(*)
                      FROM orders AS o
                      WHERE o.itemId = TestSeries.id
                        AND o.type = 'test'
                        AND o.status = 'success'
                        AND o.enrollmentStatus = 'active'
                    )
                  ) * 100,
                  2
                )
              END
            )`),
              "submissionRate",
            ],
          ],
        },
        order: [[sortBy, sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC"]],
        limit: Number(limit),
        offset,
      });

      /* ================= RESPONSE ================= */
      return res.json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + rows.length < count,
          hasPrev: Number(page) > 1,
        },
      });

    } catch (error) {
      console.error("❌ Error fetching test series (admin):", error);
      return res.status(500).json({
        success: false,
        message: "Error fetching test series",
        error: error.message,
      });
    }
  }


  static async findOneUser(req, res) {
    try {
      const testSeriesId = req.params.id;
      const userId = req.user?.id;

      /* ---------- Fetch Test Series ---------- */
      const item = await TestSeries.findByPk(testSeriesId);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      let isPurchased = false;
      let hasSubmitted = false;
      let subsmissionId = null
      let resultGenerated = false; // Default to false

      /* ---------- Check Purchase (Order) ---------- */
      if (userId) {
        const order = await Order.findOne({
          where: {
            userId,
            itemId: testSeriesId,
            type: "test",
            status: "success",
            enrollmentStatus: "active",
          },
        });

        isPurchased = !!order;
      }

      /* ---------- Check Answer Submission ---------- */
      if (userId) {
        const submission = await StudentAnswerSubmission.findOne({
          where: {
            testSeriesId,
            userId,
          },
        });

        hasSubmitted = !!submission;

        // SAFE ACCESS: Only read resultGenerated if submission exists
        if (submission) {
          subsmissionId = submission.id
          resultGenerated = submission.resultGenerated === true; // Explicit boolean
        }
        // If no submission → resultGenerated remains false
      }

      /* ---------- Response ---------- */
      return res.status(200).json({
        success: true,
        data: {
          ...item.toJSON(),
          isPurchased,
          hasSubmitted,
          subsmissionId,
          resultGenerated, // Safe: always boolean, never undefined/null
        },
      });
    } catch (error) {
      console.error("Error fetching test series:", error);

      return res.status(500).json({
        success: false,
        message: "Error fetching test series",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  }


  /* -------------------- GET ONE -------------------- */
  static async findOne(req, res) {
    try {
      const item = await TestSeries.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Test series not found" });
      }

      return res.json(item);

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error fetching test series", error });
    }
  }

  /* -------------------- UPDATE -------------------- */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const item = await TestSeries.findByPk(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      const {
        title,
        displayOrder,
        status,
        isActive,
        description,
        price,
        discountPrice,
        gst,
        testStartDate,
        testStartTime,
        AnswerSubmitDateAndTime,
        AnswerLastSubmitDateAndTime,
        timeDurationForTest,
        passing_marks,
        expirSeries,
      } = req.body;

      // ── Status validation (match ENUM) ──
      const allowedStatuses = ['new', 'normal', 'popular', 'featured'];
      let normalizedStatus = item.status;

      if (status !== undefined) {
        normalizedStatus = (status || 'new').trim().toLowerCase();
        if (!allowedStatuses.includes(normalizedStatus)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
          });
        }
      }

      // ── Number & basic validations ──
      if (discountPrice !== undefined && price !== undefined) {
        if (Number(discountPrice) > Number(price)) {
          return res.status(400).json({
            success: false,
            message: "Discount price cannot be greater than original price",
          });
        }
      }

      if (gst !== undefined && Number(gst) < 0) {
        return res.status(400).json({
          success: false,
          message: "GST cannot be negative",
        });
      }

      if (timeDurationForTest !== undefined && Number(timeDurationForTest) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Test duration must be greater than 0 minutes",
        });
      }

      // ── Date sanitization helper ──
      const safeDate = (value, currentValue) => {
        // If not provided → keep existing
        if (value === undefined || value === null) {
          return currentValue;
        }
        // Handle empty / invalid cases
        if (value === '' || value === 'Invalid date' || String(value).trim() === '') {
          return null;
        }
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
      };

      // Parse all date fields safely (keep old value if not sent)
      const parsedTestStartDate = safeDate(testStartDate, item.testStartDate);
      const parsedTestStartTime = safeDate(testStartTime, item.testStartTime);
      const parsedAnswerSubmitStart = safeDate(AnswerSubmitDateAndTime, item.AnswerSubmitDateAndTime);
      const parsedAnswerSubmitLast = safeDate(AnswerLastSubmitDateAndTime, item.AnswerLastSubmitDateAndTime);
      const parsedExpiry = safeDate(expirSeries, item.expirSeries);

      // Optional: Add logical validation (only if both dates are present)
      if (parsedAnswerSubmitStart && parsedAnswerSubmitLast &&
        parsedAnswerSubmitLast < parsedAnswerSubmitStart) {
        return res.status(400).json({
          success: false,
          message: "Last answer submission time must be after start submission time",
        });
      }

      if (parsedExpiry && parsedTestStartDate && parsedExpiry < parsedTestStartDate) {
        return res.status(400).json({
          success: false,
          message: "Expiry date cannot be before test start date",
        });
      }

      // ── Image handling ──
      let imageUrl = item.imageUrl;
      if (req.file) {
        // Delete old image if exists (optional – uncomment if you want cleanup)
        // if (item.imageUrl) {
        //   await deleteFromS3(item.imageUrl).catch(err => console.warn("Old image delete failed:", err));
        // }
        imageUrl = await uploadToS3(req.file, "testseries");
      }
      let position = await PositionService.swap(TestSeries,id,"displayOrder", displayOrder)

      // ── Perform update ──
      await item.update({
        imageUrl,
        title: title?.trim() ?? item.title,
        slug: title ? generateSlug(title) : item.slug,
        displayOrder: position !== undefined ? Number(position) : item.displayOrder,
        status: normalizedStatus,
        isActive: isActive !== undefined ? Boolean(isActive) : item.isActive,
        description: description !== undefined ? (description?.trim() || null) : item.description,
        price: price !== undefined ? Number(price) : item.price,
        discountPrice: discountPrice !== undefined ? Number(discountPrice) : item.discountPrice,
        gst: gst !== undefined ? Number(gst) : item.gst,

        testStartDate: parsedTestStartDate,
        testStartTime: parsedTestStartTime,
        AnswerSubmitDateAndTime: parsedAnswerSubmitStart,
        AnswerLastSubmitDateAndTime: parsedAnswerSubmitLast,
        expirSeries: parsedExpiry,

        timeDurationForTest: timeDurationForTest !== undefined ? Number(timeDurationForTest) : item.timeDurationForTest,
        passing_marks: passing_marks !== undefined ? Number(passing_marks) : item.passing_marks,
      });

      // ── Invalidate cache ──
      await redis.del("testseries");
      await redis.del(`testseries:${id}`);

      return res.status(200).json({
        success: true,
        message: "Test series updated successfully",
        data: item,
      });

    } catch (error) {
      console.error("TestSeries update error:", error);

      let message = "Failed to update test series. Please try again later.";
      let statusCode = 500;

      if (error.name === 'SequelizeDatabaseError') {
        const sqlMsg = error.parent?.sqlMessage || '';

        if (sqlMsg.includes('Data truncated for column \'status\'')) {
          message = "Invalid status value provided.";
          statusCode = 400;
        } else if (sqlMsg.includes('Incorrect datetime value') || sqlMsg.includes('Invalid date')) {
          message = "One or more date/time fields are invalid. Please use correct format (YYYY-MM-DD or YYYY-MM-DDTHH:mm).";
          statusCode = 400;
        } else if (sqlMsg.includes('Data too long')) {
          message = "Some field value is too long (title, description, etc.).";
          statusCode = 400;
        }
      } else if (error.name === 'SequelizeValidationError') {
        message = error.errors?.map(e => e.message).join(", ") || "Validation failed";
        statusCode = 400;
      }

      return res.status(statusCode).json({
        success: false,
        message,
        // error: error.message,   // keep only for development
      });
    }
  }
  /* -------------------- DELETE -------------------- */
  static async delete(req, res) {
    try {
      const item = await TestSeries.findByPk(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Test series not found" });
      }

      if (item.imageUrl) {
        await deleteFromS3(item.imageUrl);
      }
    await PositionService.reorder(TestSeries,"displayOrder")

      await item.destroy();

      await redis.del("testseries");
      await redis.del(`testseries:${req.params.id}`);

      return res.json({ message: "Test series deleted successfully" });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Error deleting test series", error });
    }
  }

  static async getPaymentsByTestSeries(req, res) {
    try {
      const { id: testSeriesId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      /* ---------- Validate Test Series ---------- */
      const testSeries = await TestSeries.findByPk(testSeriesId);

      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      /* ---------- Fetch Payments ---------- */
      const { rows, count } = await Order.findAndCountAll({
        where: {
          itemId: testSeriesId,
          type: "test",
          status: "success",
        },
        include: [
          {
            model: User,
            as: "user", // ✅ MUST MATCH ASSOCIATION
            attributes: ["id", "name", "email", "mobile"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: Number(limit),
        offset,
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        success: true,
        testSeries: {
          id: testSeries.id,
          title: testSeries.title,
          slug: testSeries.slug,
          price: testSeries.price,
          discountPrice: testSeries.discountPrice,
        },
        data: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + rows.length < count,
          hasPrev: Number(page) > 1,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching test series payments:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch test series payments",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  }


  static async getSubmissionsByTestSeries(req, res) {
    try {
      const { id: testSeriesId } = req.params;
      const {
        page = 1,
        limit = 20,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      /* ---------- Validate Test Series ---------- */
      const testSeries = await TestSeries.findByPk(testSeriesId);

      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      /* ---------- Fetch Submissions ---------- */
      const { rows, count } = await StudentAnswerSubmission.findAndCountAll({
        where: { testSeriesId },
        include: [
          {
            model: User,
            attributes: [
              "id",
              "name",
              "email",
              "mobile",
            ],
          },
          {
            model: TestSeries,
            attributes: [
              "id",
              "title",
              "slug",
              "AnswerSubmitDateAndTime",
              "AnswerLastSubmitDateAndTime",
            ],
          },
        ],
        order: [["submittedAt", "DESC"]],
        limit: Number(limit),
        offset,
      });

      /* ---------- Response ---------- */
      return res.status(200).json({
        success: true,
        testSeries: {
          id: testSeries.id,
          title: testSeries.title,
          slug: testSeries.slug,
          AnswerSubmitDateAndTime: testSeries?.AnswerSubmitDateAndTime,
          AnswerLastSubmitDateAndTime: testSeries?.AnswerLastSubmitDateAndTime
        },
        data: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / limit),
          hasNext: offset + rows.length < count,
          hasPrev: Number(page) > 1,
        },
      });

    } catch (error) {
      console.error("❌ Error fetching submissions:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch submissions",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  }


  static async getSubmissionById(req, res) {
    try {
      const { id } = req.params;

      /* ---------- Fetch Submission ---------- */
      const submission = await StudentAnswerSubmission.findOne({
        where: { id },
        include: [
          {
            model: User,
            attributes: ["id", "name", "email", "mobile"],
          },
          {
            model: TestSeries,
            attributes: [
              "id",
              "title",
              "slug",
              "AnswerSubmitDateAndTime",
              "AnswerLastSubmitDateAndTime",
            ],
          },
        ],
      });

      /* ---------- Not Found ---------- */
      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      /* ---------- Response ---------- */
      return res.status(200).json({
        success: true,
        data: submission,
      });

    } catch (error) {
      console.error("❌ Error fetching submission:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch submission",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  }




  /* -------------------- ADMIN: PUBLISH RESULT -------------------- */
  static async publishResult(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { submissionId } = req.params;
      const { totalMarks, marksObtained, reviewComment } = req.body;

      const submission = await StudentAnswerSubmission.findByPk(submissionId, {
        transaction,
      });

      if (!submission) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      await submission.update(
        {
          totalMarks,
          marksObtained,
          resultGenerated: true,
          checkedAt: new Date(),
          reviewStatus: "reviewed",
          reviewComment: reviewComment || null,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Result published successfully",
        data: submission,
      });

    } catch (error) {
      await transaction.rollback();
      console.error("❌ Publish result error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to publish result",
      });
    }
  }


  /* -------------------- ADMIN: UPLOAD CHECKED ANSWER SHEET -------------------- */
  static async uploadCheckedAnswerSheet(req, res) {
    const transaction = await sequelize.transaction();
    try {
      const { submissionId } = req.params;

      const submission = await StudentAnswerSubmission.findByPk(submissionId, {
        transaction,
      });

      if (!submission) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      if (!req.file) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Checked answer sheet file is required",
        });
      }
      console.log(req.file)

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(req.file.mimetype)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid file type",
        });
      }

      // Delete old checked file if exists
      if (submission.answerCheckedUrl) {
        await deleteFromS3(submission.answerCheckedUrl);
      }

      const folderPath = `testseries/${submission.testSeriesId}/checked/${submission.userId}`;
      const checkedUrl = await uploadToS3(req.file, folderPath);
      console.log("checkedUrl", checkedUrl)
      await submission.update(
        {
          answerCheckedUrl: checkedUrl,
        },
        { transaction }
      );

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: "Checked answer sheet uploaded",
        data: { answerCheckedUrl: checkedUrl },
      });

    } catch (error) {
      await transaction.rollback();
      console.error("❌ Upload checked sheet error:", error);
      return res.status(500).json({
        success: false,
        error,
        message: "Failed to upload checked answer sheet",
      });
    }
  }

  /* -------------------- ADMIN: UPDATE MARKS -------------------- */
  static async updateMarks(req, res) {
    try {
      const { submissionId } = req.params;
      const { obtainedMarks, totalMarks } = req.body;

      console.log(req.body)

      const submission = await StudentAnswerSubmission.findByPk(submissionId);

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      await submission.update({
        marksObtained: obtainedMarks,
        totalMarks,
        checkedAt: new Date(),
        resultGenerated: true,
      });

      return res.status(200).json({
        success: true,
        message: "Marks updated successfully",
        data: submission,
      });

    } catch (error) {
      console.error("❌ Update marks error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update marks",
      });
    }
  }
  /* -------------------- ADMIN: HANDLE REVIEW -------------------- */
  static async updateReviewStatus(req, res) {
    try {
      const { submissionId } = req.params;
      const { reviewStatus, reviewComment } = req.body;
      console.log(req.body)

      const submission = await StudentAnswerSubmission.findByPk(submissionId);

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      await submission.update({
        reviewStatus,
        reviewComment: reviewComment || submission.reviewComment,
      });

      return res.status(200).json({
        success: true,
        message: "Review status updated",
        data: submission,
      });

    } catch (error) {
      console.error("❌ Review update error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update review",
      });
    }
  }


  static async uploadStudentAnswerKey(req, res) {
    try {
      const { id: testSeriesId } = req.params; // test series ID
      const userId = req.user.id; // assuming auth middleware sets req.user

      const testSeries = await TestSeries.findByPk(testSeriesId);
      if (!testSeries) {
        return res.status(404).json({ message: "Test series not found" });
      }

      if (!testSeries.isActive) {
        return res.status(400).json({ message: "This test series is not active" });
      }

      // Check if file is uploaded
      if (!req.file) {
        return res.status(400).json({ message: "Answer key file is required" });
      }

      // Validate file type (PDF or images)
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({
          message: "Only PDF, JPEG, PNG, and WebP files are allowed."
        });
      }

      const now = new Date();

      const submitStart = testSeries.AnswerSubmitDateAndTime ? new Date(testSeries.AnswerSubmitDateAndTime) : null;
      const submitEnd = testSeries.AnswerLastSubmitDateAndTime ? new Date(testSeries.AnswerLastSubmitDateAndTime) : null;

      // Check submission window
      if (submitStart && now < submitStart) {
        return res.status(400).json({
          message: `Submission not started yet. Starts at: ${submitStart.toLocaleString()}`
        });
      }

      if (submitEnd && now > submitEnd) {
        return res.status(400).json({
          message: `Submission deadline passed. Last submission: ${submitEnd.toLocaleString()}`
        });
      }

      const isLate = submitEnd ? now > submitEnd : false;

      // Check if already submitted
      const existing = await sequelize.models.StudentAnswerSubmission.findOne({
        where: { testSeriesId, userId }
      });

      if (existing) {
        return res.status(400).json({ message: "You have already submitted your answer key" });
      }

      // Upload to S3
      const answerKeyUrl = await uploadToS3(req.file, `testseries/${testSeriesId}/submissions`);

      // Save submission
      const submission = await sequelize.models.StudentAnswerSubmission.create({
        testSeriesId,
        userId,
        answerKeyUrl,
        submittedAt: now,
        isLate
      });

      return res.status(200).json({
        success: true,
        message: isLate
          ? "Submitted late (after deadline)"
          : "Answer key submitted successfully!",
        data: {
          submissionId: submission.id,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
          answerKeyUrl
        }
      });

    } catch (error) {
      console.error("Error uploading student answer key:", error);
      return res.status(500).json({
        message: "Error submitting answer key",
        error: error.message
      });
    }
  }
}

module.exports = TestSeriesController;
