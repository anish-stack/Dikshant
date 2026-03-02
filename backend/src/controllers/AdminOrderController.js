"use strict";

const {
  Order,
  User,
  Batch,
  Quizzes,
  TestSeries,
  QuizesBundle,
  TestSeriesBundle,
  Coupon,

  sequelize,
  Sequelize: { Op },
} = require("../models");

const logger = require("../config/logger"); // assuming you have winston/morgan logger
const XLSX = require("xlsx");
class AdminOrderController {
  // ────────────────────────────────────────────────
  //  GET /admin/orders
  //  List all orders with filters, pagination, search
  // ────────────────────────────────────────────────
  static async getAllOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        userId,
        search,
        startDate,
        endDate,
        sortBy = "createdAt",
        sortOrder = "DESC",
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {};

      if (status) where.status = status;
      if (type) where.type = type;
      if (userId) where.userId = userId;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      if (search) {
        where[Op.or] = [
          { id: { [Op.like]: `%${search}%` } },
          { razorpayOrderId: { [Op.like]: `%${search}%` } },
          { razorpayPaymentId: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows: orders } = await Order.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email", "mobile"],
            required: false,
          },
          {
            model: Batch,
            as: "batch",
            attributes: ["id", "name", "batchDiscountPrice"],
            required: false,
          },
          {
            model: Quizzes,
            as: "Quizzes",
            attributes: ["id", "title", "price"],
            required: false,
          },
          {
            model: TestSeries,
            as: "testSeries",
            attributes: ["id", "title", "price"],
            required: false,
          },
          {
            model: QuizesBundle,
            as: "quizBundle",
            attributes: ["id", "title", "price"],
            required: false,
          },
          {
            model: TestSeriesBundle,
            as: "testSeriesBundle",
            attributes: ["id", "title", "price"],
            required: false,
          },
          {
            model: Coupon,
            as: "Coupon",
            attributes: ["code", "discount", "discountType"],
            required: false,
          },
        ],
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset,
        raw: false,
      });

      // Enrich with item name for easier frontend display
      const enrichedOrders = orders.map((order) => {
        const itemName =
          order.batch?.name ||
          order.quiz?.title ||
          order.testSeries?.title ||
          order.quizBundle?.title ||
          order.testSeriesBundle?.title ||
          "—";

        return {
          ...order.toJSON(),
          itemName,
        };
      });

      return res.json({
        success: true,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        data: enrichedOrders,
      });
    } catch (err) {
      logger.error("[AdminOrderController.getAllOrders]", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: err.message,
      });
    }
  }

  // ────────────────────────────────────────────────
  //  GET /admin/orders/stats
  //  Revenue stats, counts, trends
  // ────────────────────────────────────────────────
  static async getOrderStats(req, res) {
    try {
      const { period } = req.query; // 7d, 30d, 90d, all

      let dateFilter = null;
      const now = new Date();

      if (period === "7d") {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        dateFilter = { [Op.gte]: date };
      }

      if (period === "30d") {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        dateFilter = { [Op.gte]: date };
      }

      if (period === "90d") {
        const date = new Date();
        date.setDate(date.getDate() - 90);
        dateFilter = { [Op.gte]: date };
      }

      const baseWhere = {
        status: "success",
        ...(dateFilter && { createdAt: dateFilter }),
      };


      const [
        totalRevenue,
        orderCount,
        byType,
        topBuyers,
        recentOrders
      ] = await Promise.all([

        Order.sum("totalAmount", { where: baseWhere }),

        Order.count({ where: baseWhere }),

        Order.findAll({
          where: baseWhere,
          attributes: [
            "type",
            [sequelize.fn("SUM", sequelize.col("Order.totalAmount")), "revenue"],
            [sequelize.fn("COUNT", sequelize.col("Order.id")), "count"],
          ],
          group: ["type"],
          raw: true,
        }),

        Order.findAll({
          where: baseWhere,
          attributes: [
            "userId",
            [sequelize.fn("SUM", sequelize.col("Order.totalAmount")), "totalSpent"],
            [sequelize.fn("COUNT", sequelize.col("Order.id")), "orderCount"],
          ],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name", "email"],
            },
          ],
          group: ["Order.userId", "user.id"],
          order: [[sequelize.literal("totalSpent"), "DESC"]],
          limit: 5,
          raw: true,
          nest: true,
        }),

        Order.findAll({
          where: baseWhere,
          include: [
            { model: User, as: "user", attributes: ["name", "email"] },
          ],
          order: [["createdAt", "DESC"]],
          limit: 10,
        }),
      ]);

      return res.json({
        success: true,
        stats: {
          totalRevenue: totalRevenue || 0,
          orderCount: orderCount || 0,
          averageOrderValue: orderCount
            ? (totalRevenue / orderCount).toFixed(2)
            : 0,
          byType,
          topBuyers,
          recentOrders,
        },
      });

    } catch (err) {
      logger.error("[AdminOrderController.getOrderStats]", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch stats",
      });
    }
  }
  // ────────────────────────────────────────────────


  // ────────────────────────────────────────────────
  //  GET /admin/refunds
  //  List all refund requests
  // ────────────────────────────────────────────────


  // ────────────────────────────────────────────────
  //  POST /admin/orders/:orderId/cancel
  //  Mark order as cancelled (only pending ones)
  // ────────────────────────────────────────────────
  static async cancelOrder(req, res) {
    const { orderId } = req.params;
    const { reason } = req.body;

    try {
      const order = await Order.findByPk(orderId);

      if (!order) return res.status(404).json({ success: false, message: "Order not found" });

      if (!["pending", "created"].includes(order.status)) {
        return res.status(400).json({ success: false, message: "Order cannot be cancelled" });
      }

      await order.update({
        status: "cancelled",
        reason: reason || "Admin cancelled",
        cancelledAt: new Date(),
      });

      return res.json({ success: true, message: "Order cancelled successfully" });
    } catch (err) {
      logger.error("[AdminOrderController.cancelOrder]", err);
      return res.status(500).json({ success: false, message: "Failed to cancel order" });
    }
  }

  // ────────────────────────────────────────────────
  //  GET /admin/orders/export
  //  Basic CSV export (can be extended with json2csv etc.)
  // ────────────────────────────────────────────────
static async exportOrders(req, res) {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const data = orders.map((o) => ({
      "Order ID": o.id,
      "User Name": o.user?.name || "",
      "Email": o.user?.email || "",
      "Type": o.type,
      "Item ID": o.itemId,
      "Amount": o.totalAmount,
      "Status": o.status,
      "Created At": o.createdAt,
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=orders.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (err) {
    logger.error("[AdminOrderController.exportOrders]", err);
    return res.status(500).json({
      success: false,
      message: "Export failed",
    });
  }
}
}

module.exports = AdminOrderController;