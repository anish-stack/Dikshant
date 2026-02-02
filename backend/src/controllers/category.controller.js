
const { Category } = require("../models");

/* ------------------------------------
   CREATE CATEGORY
------------------------------------ */
exports.createCategory = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      icon,
      screen,
      filter_key,
      gradient_start,
      gradient_end,
      students_label,
      coming_soon = false,
      display_order = 0,
      is_active = true,
    } = req.body;

    // Basic validation
    if (!title || !icon || !screen || !gradient_start || !gradient_end) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const category = await Category.create({
      title,
      subtitle,
      icon,
      screen,
      filter_key,
      gradient_start,
      gradient_end,
      students_label,
      coming_soon,
      display_order,
      is_active,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.error("createCategory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

/* ------------------------------------
   GET ALL CATEGORIES (PUBLIC)
------------------------------------ */
exports.getAllCategories = async (req, res) => {
  try {
    const { activeOnly = "true" } = req.query;

    const where = {};
    if (activeOnly === "true") {
      where.is_active = true;
    }

    const categories = await Category.findAll({
      where,
      order: [["display_order", "ASC"]],
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      icon: c.icon,
      screen: c.screen,
      filter: c.filter_key,
      display_order:c.display_order,
      gradient: [c.gradient_start, c.gradient_end],
      students: c.students_label,
      comingSoon: c.coming_soon,
    }));

    return res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error("getAllCategories error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

/* ------------------------------------
   GET SINGLE CATEGORY
------------------------------------ */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("getCategoryById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};

/* ------------------------------------
   UPDATE CATEGORY
------------------------------------ */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.update(req.body);

    return res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    console.error("updateCategory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

/* ------------------------------------
   SOFT DELETE (RECOMMENDED)
------------------------------------ */
exports.softDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.update({ is_active: false });

    return res.json({
      success: true,
      message: "Category disabled successfully",
    });
  } catch (error) {
    console.error("softDeleteCategory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

/* ------------------------------------
   HARD DELETE (ADMIN ONLY)
------------------------------------ */
exports.deleteCategoryPermanently = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Category.destroy({ where: { id } });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      message: "Category deleted permanently",
    });
  } catch (error) {
    console.error("deleteCategoryPermanently error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};

/* ------------------------------------
   UPDATE DISPLAY ORDER (DRAG & DROP)
------------------------------------ */
exports.updateCategoryOrder = async (req, res) => {
  try {
    const { orders } = req.body;
    // orders = [{ id: 1, display_order: 1 }, { id: 2, display_order: 2 }]

    if (!Array.isArray(orders)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order payload",
      });
    }

    await Promise.all(
      orders.map((item) =>
        Category.update(
          { display_order: item.display_order },
          { where: { id: item.id } }
        )
      )
    );

    return res.json({
      success: true,
      message: "Category order updated",
    });
  } catch (error) {
    console.error("updateCategoryOrder error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update order",
    });
  }
};
