const { Op } = require('sequelize');
const { TestSeriesDikshant: TestSeries, TestDikshant: Test, StudentPurchaseDikshant: StudentPurchase, User, sequelize, QuestionDikshant: Question, QuestionOptionDikshant: QuestionOption, TestAttemptDikshant: TestAttempt, RankingDikshant: Ranking } = require('../models');
const redis = require("../config/redis");
const uploadToS3 = require('../utils/s3Upload');
const deleteFromS3 = require('../utils/s3Delete');
const { AppError, asyncHandler, generateSlug, paginate } = require('../utils/NewHelpers');

// ─── Public ───────────────────────────────────────────────────────────────────


// GET /test-series
exports.listSeries = asyncHandler(async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 20;

    const cacheKey = `series:list:${type || "all"}:${currentPage}:${perPage}`;

    /* =========================================
       REDIS CACHE
    ========================================= */
    try {
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (error) {
      console.error("Redis get error:", error);
    }

    /* =========================================
       FILTER
    ========================================= */
    const where = {
      is_active: true,
    };

    if (type) {
      where.type = type;
    }

    /* =========================================
       FETCH SERIES
    ========================================= */
    const { count, rows } = await TestSeries.findAndCountAll({
      where,
      include: [
        {
          model: Test,
          as: "tests",
          attributes: ["id", "status"],
          required: false,
          where: {
            deletedAt: null,
          },
        },
      ],
      order: [["createdAt", "DESC"]],
      offset: (currentPage - 1) * perPage,
      limit: perPage,
      distinct: true,
    });

    /* =========================================
       PURCHASED SERIES
    ========================================= */
let purchasedIds = [];

if (req.user?.id) {
  console.log('🔍 Fetching purchased series for user:', req.user.id);

  const purchases = await StudentPurchase.findAll({
    where: {
      user_id: req.user.id,
      payment_status: "success",
      series_id: {
        [Op.ne]: null,
      },
    },
    attributes: ["series_id"],
    raw: true,
  });

  console.log('📦 Raw purchases:', purchases);

  purchasedIds = purchases.map((item) => item.series_id);

  console.log('✅ Purchased Series IDs:', purchasedIds);
} else {
  console.log('⚠️ No user found in request');
}
    /* =========================================
       FORMAT RESPONSE
    ========================================= */
    const series = rows.map((item) => {
      const json = item.toJSON();

      const tests = json.tests || [];

      return {
        ...json,
        total_live: tests.filter((t) => t.status === "live").length,
        total_tests: tests.length,
        is_purchased: purchasedIds.includes(json.id),
      };
    });

    const result = {
      status: "success",
      data: {
        series,
        total: count,
        page: currentPage,
        limit: perPage,
        total_pages: Math.ceil(count / perPage),
      },
    };

    /* =========================================
       SAVE CACHE
    ========================================= */
 
    try {
     await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
    } catch (error) {
      console.error("Redis set error:", error);
    }

    return res.json(result);
  } catch (error) {
    console.error("listSeries Error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to fetch test series",
      error: error.message,
    });
  }
});

// GET /test-series/:slug
exports.getSeriesDetail = asyncHandler(async (req, res) => {
  try {
    const { slug } = req.params;
    const cacheKey = `series:detail:${slug}`;

    /* =========================================
       REDIS CACHE (optional only for guest)
    ========================================= */
    try {
      if (!req.user) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return res.json(JSON.parse(cached));
        }
      }
    } catch (error) {
      console.error("Redis get error:", error);
    }

    /* =========================================
       FETCH SERIES
       paranoid auto handles deleted rows
    ========================================= */
    const series = await TestSeries.findOne({
      where: {
        slug,
        is_active: true,
      },
      include: [
        {
          model: Test,
          as: "tests", // association alias
          attributes: [
            "id",
            "title",
            "test_number",
            "type",
            "status",
            "scheduled_start",
            "scheduled_end",
            "duration_minutes",
            "total_marks",
            "is_free",
          ],
          required: false,
          separate: true,
          order: [["test_number", "ASC"]],
        },
      ],
    });

    if (!series) {
      throw new AppError("Series not found", 404);
    }

    /* =========================================
       PURCHASE STATUS
    ========================================= */
    let is_purchased = false;
    let purchased_tests = [];

    if (req.user?.id) {
      const purchase = await StudentPurchase.findOne({
        where: {
          user_id: req.user.id,
          series_id: series.id,
          payment_status: "success",
        },
      });

      is_purchased = !!purchase;

      if (!is_purchased) {
        const singlePurchases = await StudentPurchase.findAll({
          where: {
            user_id: req.user.id,
            payment_status: "success",
            test_id: {
              [Op.ne]: null,
            },
          },
          attributes: ["test_id"],
          raw: true,
        });

        purchased_tests = singlePurchases.map((item) => item.test_id);
      }
    }

    /* =========================================
       FORMAT TESTS
    ========================================= */
    const json = series.toJSON();

    const tests = (json.tests || []).map((test) => ({
      ...test,
      accessible:
        json.is_free ||
        test.is_free ||
        is_purchased ||
        purchased_tests.includes(test.id),
    }));

    const result = {
      status: "success",
      data: {
        series: {
          ...json,
          tests,
          is_purchased,
        },
      },
    };

    /* =========================================
       CACHE ONLY FOR GUEST USER
    ========================================= */
    try {
      if (!req.user) {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);

      }
    } catch (error) {
      console.error("Redis set error:", error);
    }

    return res.json(result);
  } catch (error) {
    console.error("getSeriesDetail Error:", error);

    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Failed to fetch series detail",
    });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// POST /test-series  [admin]
exports.createSeries = asyncHandler(async (req, res) => {
  const { title, type, description, price, discount_price, is_free, total_tests } = req.body;
  console.log("Creating series with data:", req.body);
  const slug = generateSlug(title);
  const existing = await TestSeries.findOne({ where: { slug } });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  let thumbnail_url = null;
  if (req.file) {
    thumbnail_url = await uploadToS3(req.file, 'thumbnails');
  }

  const series = await TestSeries.create({
    title,
    slug: finalSlug,
    type,
    description,
    price: price || 0,
    discount_price,
    is_free: is_free || false,
    total_tests: total_tests || 0,
    is_active: true,
    created_by: req.user.id,
    thumbnail_url,
  });

  await redis.keys('series:list:*').then(keys => keys.length && redis.del(keys)).catch(() => null);

  res.status(201).json({ status: 'success', data: { series } });
});

// PUT /test-series/:id  [admin]
exports.updateSeries = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, price, discount_price, is_free, is_active,type, total_tests } = req.body;
  console.log( req.body)
  const series = await TestSeries.findByPk(id);
  if (!series) throw new AppError('Series not found', 404);

  const updates = { description, price, discount_price, is_free,type, is_active, total_tests };
  if (title && title !== series.title) {
    updates.title = title;
    updates.slug = generateSlug(title);
  }
  if (req.file) {
    if (series.thumbnail_url) await deleteFromS3(series.thumbnail_url).catch(() => null);
    updates.thumbnail_url = await uploadToS3(req.file, 'thumbnails');
  }

  await series.update(updates);

  await redis.keys(`series:*`).then(keys => keys.length && redis.del(keys)).catch(() => null);

  res.json({ status: 'success', data: { series } });
});

// DELETE /test-series/:id  [admin]
exports.deleteSeries = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const series = await TestSeries.findByPk(id);
  if (!series) throw new AppError('Series not found', 404);

  await series.destroy(); // paranoid soft delete
  await redis.keys('series:*').then(keys => keys.length && redis.del(keys)).catch(() => null);

  res.json({ status: 'success', message: 'Series deleted' });
});

// GET /test-series/admin/all  [admin]
exports.adminListSeries = asyncHandler(async (req, res) => {
  const { type, is_active, page = 1, limit = 20 } = req.query;
  const where = {};
  if (type) where.type = type;
  if (is_active !== undefined) where.is_active = is_active === 'true';

  const { count, rows } = await TestSeries.findAndCountAll({
    where,
    include: [{ model: User, as: 'Creator', attributes: ['id', 'name'], foreignKey: 'created_by' }],
    order: [['createdAt', 'DESC']],
    ...paginate(page, limit),
  });

  res.json({ status: 'success', data: { series: rows, total: count, page: +page, limit: +limit } });
});

// POST /test-series/:id/toggle-active  [admin]
exports.toggleActive = asyncHandler(async (req, res) => {
  const series = await TestSeries.findByPk(req.params.id);
  if (!series) throw new AppError('Series not found', 404);
  await series.update({ is_active: !series.is_active });
  await redis.keys('series:*').then(keys => keys.length && redis.del(keys)).catch(() => null);
  res.json({ status: 'success', data: { is_active: series.is_active } });
});
