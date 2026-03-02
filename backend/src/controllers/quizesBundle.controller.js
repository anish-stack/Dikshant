"use strict";

const { Op, QueryTypes } = require("sequelize");
const slugify = require("slugify");
const { QuizesBundle, Quizzes, sequelize } = require("../models");
const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

// Helpers
const toBool = (v) => v !== undefined && String(v).toLowerCase() === "true";
const toInt = (v, defaultVal = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : defaultVal;
};

// Parse quizIds safely (handles stringified arrays from frontend)
const parseQuizIds = (rawQuizIds) => {
  if (!rawQuizIds) return [];

  let ids = [];

  try {
    if (typeof rawQuizIds === "string") {
      // Handle common cases: '[11,12]', '11,12', ' [11, 12] '
      let cleaned = rawQuizIds.trim();
      if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
        ids = JSON.parse(cleaned);
      } else {
        // fallback: comma separated
        ids = cleaned.split(",").map(s => s.trim());
      }
    } else if (Array.isArray(rawQuizIds)) {
      ids = rawQuizIds;
    }

    // Convert to numbers & remove invalid
    ids = ids
      .map(id => Number(id))
      .filter(id => !isNaN(id) && id > 0);

    return ids;
  } catch (err) {
    console.error("quizIds parse error:", err, "raw:", rawQuizIds);
    return [];
  }
};

exports.createBundle = async (req, res) => {
  try {
    console.log("[CREATE BUNDLE] === START ===");
    console.log("[CREATE] Request body:", req.body);
    console.log("[CREATE] File:", req.file ? req.file.originalname : "no file");

    const {
      title,
      slug,
      description,
      isActive = true,
      price = 0,
      discountPrice = 0,
      gst = 0,
      displayOrder = 0,
      expirBundle = null,
      quizIds: rawQuizIds = [],
    } = req.body;

    // Parse quizIds
    const quizIds = parseQuizIds(rawQuizIds);
    console.log("[CREATE] Parsed quizIds:", quizIds);

    // Validation
    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        message: "Bundle title is required. Please enter a name for the bundle.",
      });
    }

    const finalSlug =
      (slug && String(slug).trim()) ||
      slugify(title, { lower: true, strict: true, trim: true });

    if (!finalSlug) {
      return res.status(400).json({
        success: false,
        message: "Invalid title or slug. Use letters, numbers, and hyphens only.",
      });
    }

    const slugExists = await QuizesBundle.findOne({ where: { slug: finalSlug } });
    if (slugExists) {
      return res.status(409).json({
        success: false,
        message: "This slug is already taken. Try a different title or edit the slug.",
      });
    }

    // Image upload
    let imageUrl = null;
    if (req.file) {
      console.log("[CREATE] Uploading image...");
      imageUrl = await uploadToS3(req.file, "quizzes_bundle");
      console.log("[CREATE] Image URL:", imageUrl);
    }

    // Create bundle
    console.log("[CREATE] Saving bundle...");
    const bundle = await QuizesBundle.create({
      imageUrl,
      title: String(title).trim(),
      slug: finalSlug,
      description: description ? String(description).trim() : null,
      isActive: toBool(isActive),
      price: toInt(price),
      discountPrice: toInt(discountPrice),
      gst: toInt(gst),
      displayOrder: toInt(displayOrder),
      expirBundle: expirBundle || null,
    });

    console.log("[CREATE] Bundle created → ID:", bundle.id);

    // Quiz association
    if (quizIds.length > 0) {
      console.log("[CREATE] Looking up quizzes with IDs:", quizIds);

      const validQuizzes = await Quizzes.findAll({
        where: { id: { [Op.in]: quizIds } },
        attributes: ["id", "title"],
      });

      console.log("[CREATE] Found quizzes:", validQuizzes.map(q => q.id));

      if (validQuizzes.length !== quizIds.length) {
        console.warn("[CREATE] Some quiz IDs not found");
        return res.status(400).json({
          success: false,
          message: "Some selected quizzes could not be found. Please check your selection.",
        });
      }

      try {
        console.log("[CREATE] Attaching quizzes...");
        await bundle.setQuizzes(validQuizzes);
        console.log("[CREATE] setQuizzes finished");

        // Verify
        const attached = await bundle.getQuizzes({ raw: true });
        console.log("[CREATE] getQuizzes result:", attached.length, "quizzes attached");

        const junctionRows = await sequelize.query(
          "SELECT * FROM Quizes_bundle_items WHERE bundle_id = ?",
          {
            replacements: [bundle.id],
            type: QueryTypes.SELECT,
          }
        );
        console.log("[CREATE] Junction table rows:", junctionRows);
      } catch (assocErr) {
        console.error("[CREATE] Association failed:", assocErr);
        // Don't fail whole request — just warn
        console.warn("Association error (non-blocking):", assocErr.message);
      }
    } else {
      console.log("[CREATE] No quizzes selected");
    }

    const created = await QuizesBundle.findByPk(bundle.id, {
      include: [
        {
          model: Quizzes,
          as: "quizzes",
          through: { attributes: [] },
          attributes: ["id", "title"],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Quiz bundle created successfully",
      data: created,
    });
  } catch (error) {
    console.error("[CREATE BUNDLE] ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create quiz bundle. Please try again or contact support.",
    });
  }
};

exports.updateBundle = async (req, res) => {
  try {
  

    const { id } = req.params;
    const bundle = await QuizesBundle.findByPk(id);

    if (!bundle) {
      return res.status(404).json({
        success: false,
        message: "Quiz bundle not found.",
      });
    }

    const {
      title,
      slug,
      description,
      isActive,
      price,
      discountPrice,
      gst,
      displayOrder,
      expirBundle,
      quizIds: rawQuizIds,
    } = req.body;

    // Parse quizIds
    const quizIds = parseQuizIds(rawQuizIds);
    // Slug
    let finalSlug = bundle.slug;
    if (slug !== undefined && slug !== bundle.slug) {
      const newSlug = String(slug).trim();
      const slugExists = await QuizesBundle.findOne({
        where: { slug: newSlug, id: { [Op.ne]: id } },
      });
      if (slugExists) {
        return res.status(409).json({
          success: false,
          message: "This slug is already used by another bundle.",
        });
      }
      finalSlug = newSlug;
    } else if (title && title !== bundle.title) {
      finalSlug = slugify(title, { lower: true, strict: true });
    }

    // Image
    let imageUrl = bundle.imageUrl;
    if (req.file) {
      if (bundle.imageUrl) {
        await deleteFromS3(bundle.imageUrl).catch(err => console.warn("Old image delete failed:", err));
      }
      imageUrl = await uploadToS3(req.file, "quizzes_bundle");
    }

    // Update
    await bundle.update({
      imageUrl,
      title: title !== undefined ? String(title).trim() : bundle.title,
      slug: finalSlug,
      description: description !== undefined ? (description ? String(description).trim() : null) : bundle.description,
      isActive: isActive !== undefined ? toBool(isActive) : bundle.isActive,
      price: price !== undefined ? toInt(price) : bundle.price,
      discountPrice: discountPrice !== undefined ? toInt(discountPrice) : bundle.discountPrice,
      gst: gst !== undefined ? toInt(gst) : bundle.gst,
      displayOrder: displayOrder !== undefined ? toInt(displayOrder) : bundle.displayOrder,
      expirBundle: expirBundle !== undefined ? expirBundle || null : bundle.expirBundle,
    });

    // Quiz association (only if explicitly sent)
    if (rawQuizIds !== undefined) {

      if (quizIds.length === 0) {
        await bundle.setQuizzes([]);
      } else {
        const validQuizzes = await Quizzes.findAll({
          where: { id: { [Op.in]: quizIds } },
          attributes: ["id", "title"],
        });

        if (validQuizzes.length !== quizIds.length) {
          return res.status(400).json({
            success: false,
            message: "Some quiz IDs are invalid or do not exist.",
          });
        }

        await bundle.setQuizzes(validQuizzes);

        const attached = await bundle.getQuizzes({ raw: true });

        const junctionRows = await sequelize.query(
          "SELECT * FROM Quizes_bundle_items WHERE bundle_id = ?",
          { replacements: [bundle.id], type: QueryTypes.SELECT }
        );
      }
    }

    const updated = await QuizesBundle.findByPk(bundle.id, {
      include: [
        {
          model: Quizzes,
          as: "quizzes",
          through: { attributes: [] },
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Quiz bundle updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("[UPDATE BUNDLE] ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update quiz bundle. Please try again.",
    });
  }
};
exports.getAllBundles = async (req, res) => {
  try {
  

    const page = toInt(req.query.page, 1);
    const limit = toInt(req.query.limit, 10);
    const offset = (page - 1) * limit;

    const search = (req.query.search || "").trim();
    const isActive = req.query.isActive !== undefined ? toBool(req.query.isActive) : undefined;

    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { slug: { [Op.like]: `%${search}%` } },
      ];
    }
    if (typeof isActive === "boolean") where.isActive = isActive;

    const { rows, count } = await QuizesBundle.findAndCountAll({
      where,
      limit,
      offset,
      order: [["displayOrder", "ASC"], ["createdAt", "DESC"]],
      include: [
        {
          model: Quizzes,
          as: "quizzes",
          through: { attributes: [] },
          attributes: ["id", "title", "image", "displayIn", "isActive", "isFree", "price", "status"],
          required: false,
        },
      ],
    });

    return res.status(200).json({
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("getAllBundles error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getBundleById = async (req, res) => {
  try {
    const { id } = req.params;

    const bundle = await QuizesBundle.findByPk(id, {
      include: [
        {
          model: Quizzes,
          as: "quizzes",
          through: { attributes: [] },
        },
      ],
    });

    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle not found" });
    }

    return res.status(200).json({ success: true, data: bundle });
  } catch (error) {
    console.error("getBundleById error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.getBundleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const bundle = await QuizesBundle.findOne({
      where: { slug },
      include: [
        {
          model: Quizzes,
          as: "quizzes",
          through: { attributes: [] },
        },
      ],
    });

    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle not found" });
    }

    return res.status(200).json({ success: true, data: bundle });
  } catch (error) {
    console.error("getBundleBySlug error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

exports.deleteBundle = async (req, res) => {
  try {
    const { id } = req.params;

    const bundle = await QuizesBundle.findByPk(id);
    if (!bundle) {
      return res.status(404).json({ success: false, message: "Bundle not found" });
    }

    await bundle.destroy(); // pivot rows cascade delete if FK set to CASCADE

    return res.status(200).json({ success: true, message: "Bundle deleted successfully" });
  } catch (error) {
    console.error("deleteBundle error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};