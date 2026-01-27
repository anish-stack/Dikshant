'use strict';

const { PdfCategory } = require("../models");

/* ================= CREATE ================= */
exports.createPdfCategory = async (req, res) => {
  try {
    const { name, status } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const category = await PdfCategory.create({
      name,
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "PDF Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("Create PdfCategory Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= READ (ALL) ================= */
exports.getAllPdfCategories = async (req, res) => {
  try {
    const { status } = req.query;

    const where = {};
    if (status) where.status = status;

    const categories = await PdfCategory.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    console.log(categories)

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get PdfCategories Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= READ (BY ID) ================= */
exports.getPdfCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await PdfCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "PDF Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Get PdfCategory Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= UPDATE ================= */
exports.updatePdfCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const category = await PdfCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "PDF Category not found",
      });
    }

    await category.update({
      name: name ?? category.name,
      status: status ?? category.status,
    });

    return res.status(200).json({
      success: true,
      message: "PDF Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("Update PdfCategory Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ================= DELETE ================= */
exports.deletePdfCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await PdfCategory.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "PDF Category not found",
      });
    }

    await category.destroy();

    return res.status(200).json({
      success: true,
      message: "PDF Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete PdfCategory Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
