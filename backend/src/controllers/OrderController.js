"use strict";

const {
  Order,
  Coupon,
  Batch,
  Program,
  Subject,
  QuizPayments,
  Quizzes,
  TestSeries,
Sequelize,
  sequelize
} = require("../models");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

const { Op } = Sequelize;

class OrderController {
  // ────────────────────────────────────────────────
  // GRANT ACCESS TO QUIZZES & TESTS INCLUDED IN A BATCH
  // Always idempotent + supports transaction
  // ────────────────────────────────────────────────
static async grantBatchChildAccess({
  userId,
  batch,
  parentOrderId,
  isAdmin = false,
  transaction = null,
}) {
  const t = transaction || (await Sequelize.transaction());

  try {
    // Idempotency check
    const existing = await Order.count({
      where: {
        userId,
        parentOrderId,
        type: { [Op.in]: ["quiz", "test"] },
      },
      transaction: t,
    });

    if (existing > 0) {
      console.log(
        `[grantBatchChildAccess] Skipped – ${existing} child orders already exist for parent ${parentOrderId}`
      );
      if (!transaction) await t.commit();
      return {
        success: true,
        skipped: true,
        message: "Child orders already granted",
        existingCount: existing,
      };
    }

    // ─── Parse quizIds & testSeriesIds correctly ────────────────────────────────
    let quizIds = [];
    let testIds = [];

    try {
      const quizRaw = batch.quizIds || '[]';
      const testRaw = batch.testSeriesIds || '[]';

      quizIds = JSON.parse(quizRaw);
      testIds = JSON.parse(testRaw);
    } catch (parseErr) {
      console.error(
        `[grantBatchChildAccess] JSON parse error for batch ${batch?.id || 'unknown'}:`,
        parseErr,
        { quizIdsRaw: batch?.quizIds, testIdsRaw: batch?.testSeriesIds }
      );
    }

    // Ensure arrays & convert IDs to numbers
    quizIds = Array.isArray(quizIds) ? quizIds.map(Number).filter(n => !isNaN(n)) : [];
    testIds  = Array.isArray(testIds)  ? testIds.map(Number).filter(n => !isNaN(n))  : [];

    console.log(`Quiz Ids after parse:`, quizIds);
    console.log(`Test  Ids after parse:`, testIds);

    // Prepare bulk data
    const quizOrders = quizIds.map((quizId) => ({
      userId,
      type: "quiz",
      itemId: quizId,
      parentOrderId,
      amount: 0,
      discount: 0,
      gst: 0,
      totalAmount: 0,
      status: "success",
      paymentDate: new Date(),
      enrollmentStatus: "active",
      reason: isAdmin ? "ADMIN_BATCH_ASSIGN" : "BATCH_INCLUDED",
      razorpayOrderId: `batch_${parentOrderId}_q_${quizId}`.slice(0, 120),
    }));

    const testOrders = testIds.map((testId) => ({
      userId,
      type: "test",
      itemId: testId,
      parentOrderId,
      amount: 0,
      discount: 0,
      gst: 0,
      totalAmount: 0,
      status: "success",
      paymentDate: new Date(),
      enrollmentStatus: "active",
      reason: isAdmin ? "ADMIN_BATCH_ASSIGN" : "BATCH_INCLUDED",
      razorpayOrderId: `batch_${parentOrderId}_t_${testId}`.slice(0, 120),
    }));

    // Bulk insert
    if (quizOrders.length > 0) {
      await Order.bulkCreate(quizOrders, { transaction: t });
    }
    if (testOrders.length > 0) {
      await Order.bulkCreate(testOrders, { transaction: t });
    }

    if (!transaction) await t.commit();

    console.log(
      `[grantBatchChildAccess] Success – parent=${parentOrderId}, quizzes=${quizOrders.length}, tests=${testOrders.length}`
    );

    return {
      success: true,
      skipped: false,
      quizzesCreated: quizOrders.length,
      testsCreated: testOrders.length,
    };
  } catch (err) {
    if (!transaction) await t.rollback();
    console.error("[grantBatchChildAccess] ERROR:", err);
    throw err;
  }
}

  // ────────────────────────────────────────────────
  // CREATE RAZORPAY ORDER + DB ENTRY
  // ────────────────────────────────────────────────
  static async createOrder(req, res) {
    console.log("🟡 CREATE ORDER API HIT", { body: req.body });

    const {
      userId,
      type,
      itemId,
      amount,
      gst = 0,
      couponCode,
      accessValidityDays,
      isFree = false, // optional flag for free/promo items
    } = req.body;

    if (!userId || !type || !itemId || amount == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const t = await sequelize.transaction();

    try {
      let discount = 0;
      let couponSnapshot = {
        couponId: null,
        couponCode: null,
        couponDiscount: null,
        couponDiscountType: null,
      };

      // Coupon logic
      if (couponCode) {
        const coupon = await Coupon.findOne({
          where: { code: couponCode.toUpperCase() },
          transaction: t,
        });

        if (!coupon) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Invalid coupon code" });
        }

        const now = new Date();
        if (now > coupon.validTill) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Coupon expired" });
        }

        couponSnapshot = {
          couponId: coupon.id,
          couponCode: coupon.code,
          couponDiscount: coupon.discount,
          couponDiscountType: coupon.discountType,
        };

        if (coupon.discountType === "flat") {
          discount = coupon.discount;
        } else if (coupon.discountType === "percentage") {
          discount = (amount * coupon.discount) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        }
      }

      const finalAmount = Math.max(0, amount - discount + gst);

      // Prevent invalid Razorpay amounts (except explicit free items)
      if (finalAmount <= 0 && !isFree) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Final amount cannot be zero or negative for paid orders",
        });
      }

      const razorOrder = await razorpay.orders.create({
        amount: Math.round(finalAmount * 100),
        currency: "INR",
        receipt: `ord_${Date.now()}`.slice(0, 40),
      });

      let quiz = null;
      if (type === "quiz") {
        quiz = await Quizzes.findByPk(itemId, { transaction: t });
        if (!quiz) {
          await t.rollback();
          return res.status(404).json({ success: false, message: "Quiz not found" });
        }

        await QuizPayments.create(
          {
            userId,
            quizId: itemId,
            razorpayOrderId: razorOrder.id,
            amount: finalAmount,
            currency: "INR",
            status: "pending",
          },
          { transaction: t }
        );
      }

      const newOrder = await Order.create(
        {
          userId,
          type,
          itemId,
          amount,
          discount,
          gst,
          totalAmount: finalAmount,
          quiz_limit: type === "quiz" ? (quiz?.attemptLimit ?? 3) : null,
          razorpayOrderId: razorOrder.id,
          status: "pending",
          couponId: couponSnapshot.couponId,
          couponCode: couponSnapshot.couponCode,
          couponDiscount: couponSnapshot.couponDiscount,
          couponDiscountType: couponSnapshot.couponDiscountType,
          accessValidityDays: accessValidityDays || null,
          enrollmentStatus: "active",
        },
        { transaction: t }
      );

      await t.commit();

      await redis.del(`orders:${userId}`);

      return res.json({
        success: true,
        message: "Order created successfully",
        razorOrder,
        key: process.env.RAZORPAY_KEY,
        order: newOrder,
      });
    } catch (error) {
      await t.rollback();
      console.error("[createOrder] ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Order creation failed",
        error: error.message,
      });
    }
  }

static async adminAssignCourse(req, res) {
    const { userId, type, itemId, accessValidityDays, reason } = req.body;

    if (!userId || !type || !itemId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const t = await sequelize.transaction();

    try {
      const newOrder = await Order.create(
        {
          userId,
          type,
          itemId,
          amount: 0,
          discount: 0,
          gst: 0,
          totalAmount: 0,
          razorpayOrderId: `admin_${Date.now()}_${type}_${itemId}`.slice(0, 120),
          status: "success",
          paymentDate: new Date(),
          accessValidityDays: accessValidityDays || null,
          enrollmentStatus: "active",
          reason: reason || "ADMIN_ASSIGNED",
        },
        { transaction: t }
      );

      if (type === "batch") {
        const batch = await Batch.findByPk(itemId, { transaction: t });
        if (batch) {
          await this.grantBatchChildAccess({
            userId,
            batch,
            parentOrderId: newOrder.id,
            isAdmin: true,
            transaction: t,
          });
        }
      }

      await NotificationController.createNotification({
        userId,
        title: "Course Assigned by Admin",
        message: `You have been enrolled in ${type} by the administrator.`,
        type: "course",
        relatedId: newOrder.id,
      });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Course assigned successfully",
        order: newOrder,
      });
    } catch (err) {
      await t.rollback();
      console.error("[adminAssignCourse] ERROR:", err);
      return res.status(500).json({ success: false, message: "Assignment failed", error: err.message });
    }
  }

  // ────────────────────────────────────────────────
  // ADMIN: REVOKE FREE/ADMIN-ASSIGNED ACCESS
  // ────────────────────────────────────────────────
  static async adminReverseAssignCourse(req, res) {
    const { userId, orderId, reason } = req.body;

    if (!userId || !orderId) {
      return res.status(400).json({ success: false, message: "userId and orderId required" });
    }

    const t = await sequelize.transaction();

    try {
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId,
          amount: 0, // only free/admin assignments
          enrollmentStatus: "active",
        },
        transaction: t,
      });

      if (!order) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Revocable admin order not found" });
      }

      await order.update(
        {
          enrollmentStatus: "cancelled",
          status: "failed",
          reason: reason || "ADMIN_REVERSED",
        },
        { transaction: t }
      );

      if (order.type === "batch") {
        await Order.update(
          {
            enrollmentStatus: "cancelled",
            status: "failed",
            reason: "BATCH_REVOKED",
          },
          {
            where: {
              userId,
              parentOrderId: order.id,
              type: { [Op.in]: ["quiz", "test"] },
            },
            transaction: t,
          }
        );
      }

      await NotificationController.createNotification({
        userId,
        title: "Course Access Revoked",
        message: "Your course access has been revoked by the administrator.",
        type: "course",
        relatedId: order.id,
      });

      await t.commit();

      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Access revoked successfully",
        order,
      });
    } catch (err) {
      await t.rollback();
      console.error("[adminReverseAssignCourse] ERROR:", err);
      return res.status(500).json({ success: false, message: "Revocation failed", error: err.message });
    }
  }
static async verifyPayment(req, res) {
  console.log("🟢 VERIFY PAYMENT API HIT", { body: req.body });

  // ✅ Normalize body (camelCase + snake_case)
  const razorpay_order_id =
    req.body.razorpay_order_id || req.body.razorpayOrderId;

  const razorpay_payment_id =
    req.body.razorpay_payment_id || req.body.razorpayPaymentId;

  const razorpay_signature =
    req.body.razorpay_signature || req.body.razorpaySignature;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Missing Razorpay verification fields",
    });
  }

  // 🔐 Signature verification
  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment signature",
    });
  }

  const t = await sequelize.transaction();

  try {
    // 🔒 Atomic lock: pending → verifying
    const [updatedRows] = await Order.update(
      { status: "verifying" },
      {
        where: {
          razorpayOrderId: razorpay_order_id,
          status: { [Op.in]: ["pending", "created"] },
        },
        transaction: t,
      }
    );

    if (updatedRows === 0) {
      const existingOrder = await Order.findOne({
        where: { razorpayOrderId: razorpay_order_id },
        transaction: t,
      });

      await t.commit();

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      if (existingOrder.status === "success") {
        return res.json({
          success: true,
          message: "Payment already verified",
          orderId: existingOrder.id,
        });
      }

      return res.status(409).json({
        success: false,
        message: `Order already processed (status: ${existingOrder.status})`,
      });
    }

    // 🔍 Fetch locked order
    const order = await Order.findOne({
      where: { razorpayOrderId: razorpay_order_id },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "Order not found after lock",
      });
    }

    // ✅ Final success update
    await order.update(
      {
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDate: new Date(),
      },
      { transaction: t }
    );

    // 🎁 Batch → auto grant quiz & test access
    if (order.type === "batch") {
      const batch = await Batch.findByPk(order.itemId, { transaction: t });
      console.log(batch)
      if (batch) {
        await OrderController.grantBatchChildAccess({
          userId: order.userId,
          batch,
          parentOrderId: order.id,
          isAdmin: false,
          transaction: t,
        });
      }
    }

    // 🎯 QuizPayments sync
    if (order.type === "quiz") {
      const quizPayment = await QuizPayments.findOne({
        where: { razorpayOrderId: razorpay_order_id },
        transaction: t,
      });

      if (quizPayment) {
        await quizPayment.update(
          {
            status: "completed",
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    // 🧹 Cache cleanup (post-commit only)
    await redis.del(`orders:${order.userId}`);
    await redis.del(`user:courses:${order.userId}`);
    await redis.del(`user:quizzes:${order.userId}`);

    return res.json({
      success: true,
      message: "Payment verified successfully",
      order:order,
      orderId: order.id,
    });
  } catch (err) {
    await t.rollback();
    console.error("[verifyPayment] ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: err.message,
    });
  }
}


static async paymentFailed(req, res) {
    const { razorpay_order_id, reason } = req.body;

    try {
      await Order.update(
        { status: "failed", reason: reason || "PAYMENT_FAILED" },
        { where: { razorpayOrderId: razorpay_order_id } }
      );

      await QuizPayments.update(
        { status: "failed" },
        { where: { razorpayOrderId: razorpay_order_id } }
      );

      return res.json({ success: true, message: "Payment marked as failed" });
    } catch (err) {
      console.error("[paymentFailed] ERROR:", err);
      return res.status(500).json({ success: false, message: "Failed to mark payment failed" });
    }
  }

static async userOrders(req, res) {
    try {
      const userId = req.params.userId;

      const orders = await Order.findAll({
        where: { userId, status: "success" },
        order: [["createdAt", "DESC"]],
      });

      const finalOrders = await Promise.all(
        orders.map(async (order) => {
          if (order.type !== "batch") return order.toJSON();

          const batch = await Batch.findOne({
            where: { id: order.itemId },
            include: [{ model: Program, as: "program", attributes: ["id", "name", "slug"] }],
          });

          if (!batch) return { ...order.toJSON(), batch: null, subjects: [] };

          let subjectIds = [];
          try {
            subjectIds = JSON.parse(batch.subjectId || "[]");
          } catch {
            subjectIds = [];
          }

          const subjects = await Subject.findAll({
            where: { id: subjectIds },
            attributes: ["id", "name", "slug", "description"],
          });

          return {
            ...order.toJSON(),
            batch: batch.toJSON(),
            subjects,
          };
        })
      );

      return res.json(finalOrders);
    } catch (err) {
      console.error("[userOrders] ERROR:", err);
      return res.status(500).json({ success: false, message: "Error fetching orders" });
    }
  }
  // ALL ORDERS (ADMIN)
  static async allOrders(req, res) {
    try {
      const orders = await Order.findAll();

      return res.json(orders);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching all orders", e });
    }
  }

  // GET ORDER BY ID
  static async getOrderById(req, res) {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findByPk(orderId);

      if (!order)
        return res.status(404).json({ message: "Order not found" });

      return res.json(order);

    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching order", e });
    }
  }

static async alreadyPurchased(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const { itemId, type } = req.query;

      if (!userId || !itemId || !type) {
        return res.status(400).json({ success: false, message: "userId, itemId and type required" });
      }

      const order = await Order.findOne({
        where: {
          userId,
          itemId,
          type,
          status: "success",
          enrollmentStatus: "active",
        },
      });

      if (!order) {
        return res.json({ success: true, purchased: false });
      }

      const response = {
        success: true,
        purchased: true,
        orderId: order.id,
        paymentDate: order.paymentDate,
        totalAmount: order.totalAmount,
        couponCode: order.couponCode,
      };

      if (type === "quiz") {
        const limit = order.quiz_limit ?? 3;
        const used = order.quiz_attempts_used ?? 0;
        const remaining = Math.max(limit - used, 0);

        response.quizLimit = limit;
        response.quizAttemptsUsed = used;
        response.remainingAttempts = remaining;
        response.canAttempt = remaining > 0;
        if (!response.canAttempt) response.message = "Quiz attempt limit reached";
      }

      if (type === "test") {
        const testSeries = await TestSeries.findByPk(itemId);
        if (!testSeries) {
          return res.status(404).json({ success: false, message: "Test series not found" });
        }

        const now = new Date();
        const expired = testSeries.expirSeries && new Date(testSeries.expirSeries) < now;

        response.testSeries = {
          id: testSeries.id,
          title: testSeries.title,
          expirSeries: testSeries.expirSeries,
        };
        response.canAccess = !expired;
        if (expired) response.message = "Test series access has expired";
      }

      return res.json(response);
    } catch (err) {
      console.error("[alreadyPurchased] ERROR:", err);
      return res.status(500).json({ success: false, message: "Failed to check purchase status" });
    }
  }



  // GET USER'S QUIZ ORDERS WITH FULL QUIZ DETAILS & ATTEMPT INFO
  static async getUserQuizOrders(req, res) {
    try {
      const userId = req.user?.id || req.params.userId || req.query.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required",
        });
      }

      console.log("GET USER QUIZ ORDERS:", { userId });

      // Fetch all successful quiz orders for the user
      const quizOrders = await Order.findAll({
        where: {
          userId,
          type: "quiz",
          status: "success",
          enrollmentStatus: "active",
        },
        attributes: [
          "id",
          "itemId",
          "totalAmount",
          "paymentDate",
          "quiz_limit",
          "quiz_attempts_used",
          "createdAt",
        ],
        order: [["paymentDate", "DESC"]],
      });

      if (quizOrders.length === 0) {
        return res.json({
          success: true,
          message: "No purchased quizzes found",
          quizzes: [],
        });
      }

      // Fetch full quiz details for all ordered quiz IDs
      const quizIds = quizOrders.map((order) => order.itemId);

      const quizzes = await Quizzes.findAll({
        where: {
          id: quizIds,
          is_active: true, // only active quizzes
        },
        attributes: [
          "id",
          "title",
          "description",
          "image",
          "price",
          "durationMinutes",
          "totalQuestions",
          "totalMarks",
          "passingMarks",
          "attemptLimit",
          "is_free",
        ],
      });

      // Map quizzes to a lookup object
      const quizMap = {};
      quizzes.forEach((quiz) => {
        quizMap[quiz.id] = quiz.toJSON();
      });

      // Combine order + quiz data
      const finalQuizList = quizOrders.map((order) => {
        const quiz = quizMap[order.itemId];

        if (!quiz) {
          return null; // skip if quiz deleted/deactivated
        }

        const defaultLimit = quiz.attemptLimit || 3;
        const orderLimit = order.quiz_limit || defaultLimit;
        const attemptsUsed = order.quiz_attempts_used || 0;
        const remainingAttempts = Math.max(orderLimit - attemptsUsed, 0);

        return {
          orderId: order.id,
          purchasedAt: order.paymentDate,
          amountPaid: order.totalAmount,

          quiz: {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            image: quiz.image,
            price: quiz.price,
            durationMinutes: quiz.durationMinutes,
            totalQuestions: quiz.totalQuestions,
            totalMarks: quiz.totalMarks,
            passingMarks: quiz.passingMarks,
            isFree: quiz.is_free,

            // Attempt Info
            attemptLimit: orderLimit,
            attemptsUsed: attemptsUsed,
            remainingAttempts: remainingAttempts,
            canAttempt: remainingAttempts > 0,
          },
        };
      }).filter(Boolean); // remove nulls

      return res.json({
        success: true,
        count: finalQuizList.length,
        quizzes: finalQuizList,
      });

    } catch (error) {
      console.error("GET USER QUIZ ORDERS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch quiz orders",
        error: error.message,
      });
    }
  }

  // DELETE ORDER
  static async deleteOrder(req, res) {
    try {
      const orderId = req.params.orderId;
      const order = await Order.findByPk(orderId);

      if (!order)
        return res.status(404).json({ message: "Order not deleted" });

      await order.destroy();

      return res.json({ success: true, message: "Order deleted" });

    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error deleting order", e });
    }
  }

}

module.exports = OrderController;