'use strict';

const { Op } = require("sequelize");
const slugify = require("slugify");
const { TestSeriesBundle, TestSeries, sequelize } = require("../models");

// helper: safe slug
const makeSlug = (text) =>
  slugify(String(text || ""), { lower: true, strict: true, trim: true });

const pickBundleFields = (body) => ({
  imageUrl: body.imageUrl ?? null,
  title: body.title ?? null,
  slug: body.slug ? makeSlug(body.slug) : null,
  description: body.description ?? null,
  isActive: body.isActive ?? true,
  price: body.price ?? null,
  discountPrice: body.discountPrice ?? null,
  gst: body.gst ?? null,
  displayOrder: body.displayOrder ?? 0,
  expirBundle: body.expirBundle ?? null,
});

const normalizeIds = (arr) => {
  if (!arr) return [];
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)]
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x));
};

module.exports = {
  // ✅ CREATE
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const isAdmin = req.query.isAdmin === "true" || req.query.admin === "true";

      // (optional) admin guard
      // if (!isAdmin) return res.status(403).json({ success:false, message:"Forbidden" });

      const { testSeriesIds } = req.body;
      const payload = pickBundleFields(req.body);

      if (!payload.title) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "title is required" });
      }

      // Auto slug if not provided
      if (!payload.slug) payload.slug = makeSlug(payload.title);

      const ids = normalizeIds(testSeriesIds);

      // Create bundle
      const bundle = await TestSeriesBundle.create(payload, { transaction: t });

      // Attach test series (optional)
      if (ids.length > 0) {
        // validate testseries exist
        const series = await TestSeries.findAll({
          where: { id: { [Op.in]: ids } },
          transaction: t,
        });

        const foundIds = new Set(series.map((s) => s.id));
        const missing = ids.filter((id) => !foundIds.has(id));

        if (missing.length) {
          await t.rollback();
          return res.status(400).json({
            success: false,
            message: "Some testSeriesIds are invalid",
            missingIds: missing,
          });
        }

        await bundle.setTestSeries(ids, { transaction: t }); // uses alias "testSeries"
      }

      await t.commit();

      const created = await TestSeriesBundle.findByPk(bundle.id, {
        include: [{ model: TestSeries, as: "testSeries", through: { attributes: [] } }],
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error) {
      await t.rollback();
      console.error("Bundle create error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ✅ GET ALL (pagination + search)
  async getAll(req, res) {
    try {
      const isAdmin = req.query.isAdmin === "true" || req.query.admin === "true";

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search ? String(req.query.search).trim() : "";
      const offset = (page - 1) * limit;

      const where = {};

      // user side only active bundles
      if (!isAdmin) where.isActive = true;

      // admin search on title/slug
      if (isAdmin && search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { slug: { [Op.like]: `%${search}%` } },
        ];
      }

      const queryOptions = {
        where,
        order: [
          ["displayOrder", "ASC"],
          ["createdAt", "DESC"],
        ],
        include: [
          {
            model: TestSeries,
            as: "testSeries",
            through: { attributes: [] },
            // For user side you can limit fields:
            attributes: ["id", "title", "slug", "imageUrl", "isActive", "price", "discountPrice", "gst"],
          },
        ],
      };

      // admin pagination
      if (isAdmin) {
        queryOptions.limit = limit;
        queryOptions.offset = offset;
      }

      const { rows, count } = await TestSeriesBundle.findAndCountAll(queryOptions);

      return res.json({
        success: true,
        data: rows,
        ...(isAdmin && {
          pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
          },
        }),
      });
    } catch (error) {
      console.error("Bundle getAll error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ✅ GET BY ID
  async getById(req, res) {
    try {
      const isAdmin = req.query.isAdmin === "true" || req.query.admin === "true";
      const { id } = req.params;

      const where = { id: Number(id) };
      if (!isAdmin) where.isActive = true;

      const bundle = await TestSeriesBundle.findOne({
        where,
        include: [{ model: TestSeries, as: "testSeries", through: { attributes: [] } }],
      });

      if (!bundle) {
        return res.status(404).json({ success: false, message: "Bundle not found" });
      }

      return res.json({ success: true, data: bundle });
    } catch (error) {
      console.error("Bundle getById error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ✅ UPDATE (Edit) - details + items optional
  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const isAdmin = req.query.isAdmin === "true" || req.query.admin === "true";
      // if (!isAdmin) return res.status(403).json({ success:false, message:"Forbidden" });

      const { id } = req.params;
      const { testSeriesIds } = req.body;

      const bundle = await TestSeriesBundle.findByPk(id, { transaction: t });
      if (!bundle) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Bundle not found" });
      }

      // Update fields (only those provided)
      const payload = pickBundleFields(req.body);

      // prevent null title overwrite if not provided
      if (req.body.title == null) delete payload.title;
      if (req.body.slug == null) delete payload.slug;

      // If title changed and slug not provided, auto update slug
      if (req.body.title && !req.body.slug) {
        payload.slug = makeSlug(req.body.title);
      }

      await bundle.update(payload, { transaction: t });

      // Update items if provided
      if (testSeriesIds !== undefined) {
        const ids = normalizeIds(testSeriesIds);

        if (ids.length > 0) {
          const series = await TestSeries.findAll({
            where: { id: { [Op.in]: ids } },
            transaction: t,
          });

          const foundIds = new Set(series.map((s) => s.id));
          const missing = ids.filter((x) => !foundIds.has(x));

          if (missing.length) {
            await t.rollback();
            return res.status(400).json({
              success: false,
              message: "Some testSeriesIds are invalid",
              missingIds: missing,
            });
          }
        }

        // replace entire list
        await bundle.setTestSeries(ids, { transaction: t });
      }

      await t.commit();

      const updated = await TestSeriesBundle.findByPk(bundle.id, {
        include: [{ model: TestSeries, as: "testSeries", through: { attributes: [] } }],
      });

      return res.json({ success: true, data: updated });
    } catch (error) {
      await t.rollback();
      console.error("Bundle update error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },

  // ✅ DELETE
  async remove(req, res) {
    const t = await sequelize.transaction();
    try {
      const isAdmin = req.query.isAdmin === "true" || req.query.admin === "true";
      // if (!isAdmin) return res.status(403).json({ success:false, message:"Forbidden" });

      const { id } = req.params;

      const bundle = await TestSeriesBundle.findByPk(id, { transaction: t });
      if (!bundle) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Bundle not found" });
      }

      // this will also remove pivot rows due to cascade in pivot FK
      await bundle.destroy({ transaction: t });

      await t.commit();
      return res.json({ success: true, message: "Bundle deleted" });
    } catch (error) {
      await t.rollback();
      console.error("Bundle delete error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  },
};