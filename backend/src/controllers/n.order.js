"use strict";

const { Order, Coupon, Batch, Program, Subject, QuizPayments, Quizzes, TestSeries, EmiPayment, Sequelize } = require("../models");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

class OrderController {

  /**
   * 🔒 PREVENT DUPLICATE CHILD ORDERS
   * - Checks if child orders already exist before creating
   * - Idempotent: Safe to call multiple times
   */
  static async grantBatchChildAccess({
    userId,
    batch,
    parentOrderId,
    isAdmin = false
  }) {
    try {
      // ✅ IDEMPOTENCY CHECK: Prevent duplicate child orders
      const existingChildOrders = await Order.count({
        where: {
          userId,
          parentOrderId,
          type: { [Sequelize.Op.in]: ["quiz", "test"] }
        }
      });

      if (existingChildOrders > 0) {
        console.log("⚠️ Child orders already exist for batch:", parentOrderId);
        return { 
          success: true, 
          skipped: true, 
          message: "Child orders already granted",
          existingCount: existingChildOrders
        };
      }

      // ================= QUIZZES =================
      const quizIds = Array.isArray(batch.quizIds) ? batch.quizIds : [];

      for (const quizId of quizIds) {
        await Order.create({
          userId,
          type: "quiz",
          itemId: quizId,
          parentOrderId, // 🔗 Link to parent batch order
          amount: 0,
          discount: 0,
          gst: 0,
          totalAmount: 0,
          status: "success",
          paymentDate: new Date(),
          enrollmentStatus: "active",
          reason: isAdmin ? "ADMIN_BATCH_ASSIGN" : "BATCH_INCLUDED",
          razorpayOrderId: `batch_${parentOrderId}_quiz_${quizId}`
        });
      }

      // ================= TEST SERIES =================
      const testSeriesIds = Array.isArray(batch.testSeriesIds)
        ? batch.testSeriesIds
        : [];

      for (const testId of testSeriesIds) {
        await Order.create({
          userId,
          type: "test",
          itemId: testId,
          parentOrderId, // 🔗 Link to parent batch order
          amount: 0,
          discount: 0,
          gst: 0,
          totalAmount: 0,
          status: "success",
          paymentDate: new Date(),
          enrollmentStatus: "active",
          reason: isAdmin ? "ADMIN_BATCH_ASSIGN" : "BATCH_INCLUDED",
          razorpayOrderId: `batch_${parentOrderId}_test_${testId}`
        });
      }

      console.log(`✅ Granted batch access:`, {
        parentOrderId,
        quizzesCreated: quizIds.length,
        testsCreated: testSeriesIds.length
      });

      return { 
        success: true, 
        skipped: false,
        quizzesCreated: quizIds.length,
        testsCreated: testSeriesIds.length
      };
    } catch (error) {
      console.error("❌ grantBatchChildAccess ERROR:", error);
      throw error;
    }
  }

  /**
   * ⏳ SYNC BATCH ACCESS EXPIRY
   * - Calculates expiry date from payment date + validity days
   * - Syncs parent and all child orders
   */
  static async syncBatchAccessExpiry(order, batch) {
    try {
      if (!order || !batch) {
        console.warn("⚠️ syncBatchAccessExpiry: Missing order or batch");
        return;
      }

      const accessValidityDays = order.accessValidityDays || 
                                 batch.accessValidityDays || 
                                 365; // default fallback

      const expiryDate = new Date(order.paymentDate);
      expiryDate.setDate(expiryDate.getDate() + accessValidityDays);

      // Update parent batch order
      await order.update({
        expiryDate,
        accessValidityDays
      });

      // ✅ SYNC: Update all child orders with same expiry
      if (order.type === "batch") {
        const childCount = await Order.update(
          {
            expiryDate,
            accessValidityDays
          },
          {
            where: {
              parentOrderId: order.id
            }
          }
        );

        console.log(`✅ Synced expiry for batch ${order.id}:`, {
          expiryDate: expiryDate.toISOString(),
          accessValidityDays,
          childOrdersUpdated: childCount[0] || 0
        });
      }
    } catch (error) {
      console.error("❌ syncBatchAccessExpiry ERROR:", error);
      throw error;
    }
  }

  /**
   * 🎁 CHECK EMI ACCESS STATUS
   * Returns whether user can access course based on EMI payment status
   */
  static async checkEmiAccessStatus(order) {
    try {
      if (!order.isEmi) {
        return {
          isEmi: false,
          canAccess: order.status === 'success' && order.enrollmentStatus === 'active'
        };
      }

      // Get all EMI payments
      const emiPayments = await EmiPayment.findAll({
        where: { orderId: order.id },
        order: [['installmentNumber', 'ASC']]
      });

      if (emiPayments.length === 0) {
        return {
          isEmi: true,
          canAccess: false,
          reason: "No EMI schedule found"
        };
      }

      const now = new Date();
      const totalInstallments = emiPayments.length;
      const paidInstallments = emiPayments.filter(e => e.status === 'paid').length;
      const failedInstallments = emiPayments.filter(e => e.status === 'failed').length;
      const overdueInstallments = emiPayments.filter(e => 
        e.status === 'pending' && new Date(e.dueDate) < now
      ).length;

      // Logic: User can access ONLY if:
      // 1. At least 1st installment is paid
      // 2. No failed installments
      // 3. No overdue installments
      const firstInstallmentPaid = emiPayments[0]?.status === 'paid';
      const hasFailedInstallment = failedInstallments > 0;
      const hasOverdueInstallment = overdueInstallments > 0;

      const canAccess = firstInstallmentPaid && 
                        !hasFailedInstallment && 
                        !hasOverdueInstallment;

      const nextUnpaidInstallment = emiPayments.find(e => e.status === 'pending');

      return {
        isEmi: true,
        canAccess,
        totalInstallments,
        paidInstallments,
        failedInstallments,
        overdueInstallments,
        nextUnpaidInstallment: nextUnpaidInstallment ? {
          installmentNumber: nextUnpaidInstallment.installmentNumber,
          amount: nextUnpaidInstallment.amount,
          dueDate: nextUnpaidInstallment.dueDate
        } : null,
        reason: !canAccess ? 
          (hasFailedInstallment ? "Payment failed on an installment" :
           hasOverdueInstallment ? "EMI payment overdue" :
           !firstInstallmentPaid ? "First installment not paid yet" :
           "Access blocked") : null
      };
    } catch (error) {
      console.error("❌ checkEmiAccessStatus ERROR:", error);
      throw error;
    }
  }

  // CREATE RAZORPAY ORDER
  static async createOrder(req, res) {
    console.log("🟡 CREATE ORDER API HIT");
    console.log("➡️ BODY:", req.body);

    try {
      const {
        userId,
        type,
        itemId,
        amount,
        gst = 0,
        couponCode
      } = req.body;

      console.log("📦 Parsed Fields:", {
        userId, type, itemId, amount, gst, couponCode
      });

      if (!userId || !type || !itemId || !amount) {
        console.warn("❌ Missing required fields");
        return res.status(400).json({ message: "Missing required fields" });
      }

      let discount = 0;
      let couponSnapshot = {
        couponId: null,
        couponCode: null,
        couponDiscount: null,
        couponDiscountType: null
      };

      /* 🎟 Coupon Validation */
      if (couponCode) {
        console.log("🎫 Coupon Code Received:", couponCode);

        const coupon = await Coupon.findOne({
          where: { code: couponCode.toUpperCase() }
        });

        console.log("🎫 Coupon Found:", coupon?.id);

        if (!coupon) {
          console.warn("❌ Invalid coupon");
          return res.status(404).json({ message: "Invalid coupon code" });
        }

        const now = new Date();
        if (now > coupon.validTill) {
          console.warn("❌ Coupon expired");
          return res.status(400).json({ message: "Coupon expired" });
        }

        couponSnapshot = {
          couponId: coupon.id,
          couponCode: coupon.code,
          couponDiscount: coupon.discount,
          couponDiscountType: coupon.discountType
        };

        if (coupon.discountType === "flat") {
          discount = coupon.discount;
        }

        if (coupon.discountType === "percentage") {
          discount = (amount * coupon.discount) / 100;
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        }

        console.log("💸 Discount Calculated:", discount);
      }

      const totalAmount = amount - discount + gst;

      console.log("🧮 Final Amount:", {
        amount,
        discount,
        gst,
        totalAmount
      });

      /* 🔐 Razorpay Keys Debug */
      console.log("🔐 Razorpay Key Loaded:", {
        key_id: process.env.RAZORPAY_KEY ? "✅ YES" : "❌ NO",
        key_secret: process.env.RAZORPAY_SECRET ? "✅ YES" : "❌ NO"
      });

      /* 💳 Razorpay Order */
      console.log("🚀 Creating Razorpay Order...");

      const razorOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `order_${Date.now()}`
      });

      console.log("✅ Razorpay Order Created:", razorOrder.id);

      let quiz = null;

      /* 🎯 If order is for QUIZ, save in quiz_payments */
      if (type === "quiz") {
        console.log("🎯 Quiz order detected, saving QuizPayments entry");
        quiz = await Quizzes.findByPk(itemId);

        if (!quiz) {
          console.warn("❌ Quiz not found for QuizPayments");
          return res.status(404).json({ message: "Quiz not found" });
        }
        console.log("📘 Quiz Found:", quiz);
        
        await QuizPayments.create({
          userId: userId,
          quizId: itemId,
          razorpayOrderId: razorOrder.id,
          amount: totalAmount,
          currency: "INR",
          status: "pending",
        });

        console.log("✅ QuizPayments entry created");
      }

      /* 🧾 DB Order */
      const newOrder = await Order.create({
        userId,
        type,
        itemId,
        amount,
        discount,
        gst,
        totalAmount,
        quiz_limit: type === "quiz" && quiz?.attemptLimit || 3,
        razorpayOrderId: razorOrder.id,
        status: "pending",
        couponId: couponSnapshot.couponId,
        couponCode: couponSnapshot.couponCode,
        couponDiscount: couponSnapshot.couponDiscount,
        couponDiscountType: couponSnapshot.couponDiscountType,
        accessValidityDays: req.body.accessValidityDays || null,
        enrollmentStatus: "active"
      });

      console.log("📦 Order Saved:", newOrder.id);

      await redis.del(`orders:${userId}`);
      console.log("🧹 Redis cache cleared");

      return res.json({
        success: true,
        message: "Order created successfully",
        razorOrder,
        key: process.env.RAZORPAY_KEY,
        order: newOrder
      });

    } catch (error) {
      console.error("🔥 ORDER CREATE ERROR FULL:", {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        stack: error.stack
      });

      return res.status(500).json({
        message: "Order creation failed",
        razorpayError: error.error || null
      });
    }
  }

  static async verifyPayment(req, res) {
    console.log("🟢 VERIFY PAYMENT API HIT");
    console.log("➡️ BODY:", req.body);

    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Missing Razorpay verification fields",
        });
      }

      /* 🔐 Signature verification */
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

      /* 🔍 Fetch order */
      const order = await Order.findOne({
        where: { razorpayOrderId: razorpay_order_id },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      /* 🛑 Prevent duplicate verification */
      if (order.status === "success") {
        return res.json({
          success: true,
          message: "Payment already verified",
          order,
        });
      }

      /* ✅ Update Order */
      await order.update({
        status: "success",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDate: new Date(),
      });

      // ✅ SYNC BATCH EXPIRY & GRANT ACCESS
      if (order.type === "batch") {
        const batch = await Batch.findByPk(order.itemId);

        if (batch) {
          // Sync expiry dates
          await OrderController.syncBatchAccessExpiry(order, batch);

          // Grant child access (with idempotency)
          await OrderController.grantBatchChildAccess({
            userId: order.userId,
            batch,
            parentOrderId: order.id,
            isAdmin: false
          });
        }
      }

      /* 🎯 Update QuizPayments */
      if (order.type === "quiz") {
        const quizPayment = await QuizPayments.findOne({
          where: { razorpayOrderId: razorpay_order_id },
        });

        if (!quizPayment) {
          return res.status(404).json({
            success: false,
            message: "Quiz payment record not found",
          });
        }

        await quizPayment.update({
          status: "completed",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
        });
      }

      /* 🧹 Clear cache */
      await redis.del(`orders:${order.userId}`);
      await redis.del(`user:quizzes:${order.userId}`);

      return res.json({
        success: true,
        message: "Payment verified successfully",
        orderId: order.id,
      });

    } catch (error) {
      console.error("🔥 VERIFY PAYMENT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Payment verification failed",
        error: error.message,
      });
    }
  }

  static async paymentFailed(req, res) {
    try {
      const { razorpay_order_id, reason } = req.body;

      await Order.update(
        { status: "failed", reason: reason || "PAYMENT_FAILED" },
        { where: { razorpayOrderId: razorpay_order_id } }
      );

      await QuizPayments.update(
        { status: "failed" },
        { where: { razorpayOrderId: razorpay_order_id } }
      );

      return res.json({
        success: true,
        message: "Payment marked as failed",
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to mark payment failed",
      });
    }
  }

  static async userOrders(req, res) {
    try {
      const userId = req.params.userId;

      const orders = await Order.findAll({
        where: {
          userId,
          status: "success",
          parentOrderId: null // Only parent orders
        },
        order: [["createdAt", "DESC"]],
      });

      const finalOrders = await Promise.all(
        orders.map(async (order) => {
          if (order.type !== "batch") return order.toJSON();

          const batch = await Batch.findOne({
            where: { id: order.itemId },
            include: [
              {
                model: Program,
                as: "program",
                attributes: ["id", "name", "slug"],
              },
            ],
          });

          if (!batch) {
            return {
              ...order.toJSON(),
              batch: null,
              subjects: [],
            };
          }

          let subjectIds = [];
          try {
            subjectIds = JSON.parse(batch.subjectId || "[]");
          } catch (e) {
            subjectIds = [];
          }

          const subjectsList = await Subject.findAll({
            where: { id: subjectIds },
            attributes: ["id", "name", "slug", "description"],
          });

          return {
            ...order.toJSON(),
            batch: batch.toJSON(),
            subjects: subjectsList,
          };
        })
      );

      return res.json(finalOrders);

    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching orders", e });
    }
  }

  static async allOrders(req, res) {
    try {
      const orders = await Order.findAll();
      return res.json(orders);
    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Error fetching all orders", e });
    }
  }

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

  /**
   * CHECK IF ALREADY PURCHASED
   * - Checks access validity expiry
   * - Checks EMI payment status
   * - Returns comprehensive access info
   */
  static async alreadyPurchased(req, res) {
    try {
      const userId = req.user?.id || req.query.userId;
      const { itemId, type } = req.query;

      console.log("🟢 ALREADY PURCHASED API HIT", {
        userId,
        itemId,
        type,
      });

      if (!userId || !itemId || !type) {
        return res.status(400).json({
          success: false,
          message: "userId, itemId and type are required",
        });
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

      /* NOT PURCHASED */
      if (!order) {
        return res.json({
          success: true,
          purchased: false,
        });
      }

      /* BASE RESPONSE */
      const isExpired = order.expiryDate && new Date() > new Date(order.expiryDate);

      // Check EMI status
      const emiStatus = await OrderController.checkEmiAccessStatus(order);

      const response = {
        success: true,
        purchased: true,
        orderId: order.id,
        paymentDate: order.paymentDate,
        totalAmount: order.totalAmount,
        couponCode: order.couponCode,
        accessValidityDays: order.accessValidityDays,
        expiryDate: order.expiryDate,
        daysRemainingAccess: order.daysRemainingAccess,
        isExpired: isExpired,
        emi: emiStatus
      };

      // Determine final access
      let canAccess = true;
      let blockReason = null;

      if (isExpired) {
        canAccess = false;
        blockReason = "Access validity expired";
      } else if (emiStatus.isEmi && !emiStatus.canAccess) {
        canAccess = false;
        blockReason = emiStatus.reason;
      }

      response.canAccess = canAccess;
      if (!canAccess) response.blockReason = blockReason;

      /* QUIZ LOGIC */
      if (type === "quiz") {
        const quizLimit = order.quiz_limit ?? 0;
        const attemptsUsed = order.quiz_attempts_used ?? 0;

        const remainingAttempts =
          quizLimit > 0 ? Math.max(quizLimit - attemptsUsed, 0) : 0;

        response.quizLimit = quizLimit;
        response.quizAttemptsUsed = attemptsUsed;
        response.remainingAttempts = remainingAttempts;
        response.canAttempt = canAccess && (quizLimit === 0 ? false : remainingAttempts > 0);

        if (!response.canAttempt && canAccess) {
          response.message = "Quiz attempt limit reached";
        }
      }

      /* TEST SERIES LOGIC */
      if (type === "test") {
        const testSeries = await TestSeries.findByPk(itemId);

        if (!testSeries) {
          return res.status(404).json({
            success: false,
            message: "Test series not found",
          });
        }

        const now = new Date();
        const isTestExpired =
          testSeries.expirSeries &&
          new Date(testSeries.expirSeries) < now;

        response.testSeries = {
          id: testSeries.id,
          title: testSeries.title,
          expirSeries: testSeries.expirSeries,
        };

        response.canAccess = canAccess && !isTestExpired;

        if (isTestExpired) {
          response.message = "Test series access has expired";
        }
      }

      return res.json(response);

    } catch (error) {
      console.error("🔥 ALREADY PURCHASED ERROR:", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        message: "Failed to check purchase status",
      });
    }
  }

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
          parentOrderId: null // Only parent orders, not child orders
        },
        attributes: [
          "id",
          "itemId",
          "totalAmount",
          "paymentDate",
          "quiz_limit",
          "quiz_attempts_used",
          "expiryDate",
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
          is_active: true,
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
          return null;
        }

        const defaultLimit = quiz.attemptLimit || 3;
        const orderLimit = order.quiz_limit || defaultLimit;
        const attemptsUsed = order.quiz_attempts_used || 0;
        const remainingAttempts = Math.max(orderLimit - attemptsUsed, 0);
        
        // Check expiry
        const isExpired = order.expiryDate && new Date() > new Date(order.expiryDate);

        return {
          orderId: order.id,
          purchasedAt: order.paymentDate,
          amountPaid: order.totalAmount,
          expiryDate: order.expiryDate,
          isExpired: isExpired,

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
            canAttempt: !isExpired && remainingAttempts > 0,
          },
        };
      }).filter(Boolean);

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

  // ============ EMI PAYMENT METHODS ============

  /**
   * CREATE EMI PAYMENT FOR INSTALLMENT
   */
  static async createEmiPayment(req, res) {
    try {
      const {
        orderId,
        installmentNumber,
        amount
      } = req.body;

      if (!orderId || !installmentNumber || !amount) {
        return res.status(400).json({
          message: "Missing required fields: orderId, installmentNumber, amount"
        });
      }

      // Find order
      const order = await Order.findByPk(orderId);
      if (!order || !order.isEmi) {
        return res.status(404).json({
          message: "EMI order not found"
        });
      }

      // Get batch details
      const batch = await Batch.findByPk(order.itemId);
      if (!batch || !batch.isEmi) {
        return res.status(400).json({
          message: "Batch is not an EMI batch"
        });
      }

      // Validate installment
      if (!batch.emiSchedule || installmentNumber > batch.emiSchedule.length) {
        return res.status(400).json({
          message: "Invalid installment number"
        });
      }

      // Create Razorpay order for this EMI installment
      const razorOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `emi_${orderId}_inst_${installmentNumber}_${Date.now()}`
      });

      // Create EMI payment record
      const emiPayment = await EmiPayment.create({
        orderId,
        userId: order.userId,
        batchId: order.itemId,
        installmentNumber,
        amount,
        dueDate: batch.emiSchedule[installmentNumber - 1].dueDate,
        status: "pending",
        razorpayOrderId: razorOrder.id,
        reason: "USER_INITIATED"
      });

      return res.json({
        success: true,
        message: "EMI payment initialized",
        razorOrder,
        key: process.env.RAZORPAY_KEY,
        emiPayment
      });

    } catch (error) {
      console.error("EMI PAYMENT CREATE ERROR:", error);
      return res.status(500).json({
        message: "Failed to create EMI payment",
        error: error.message
      });
    }
  }

  /**
   * VERIFY EMI PAYMENT
   */
  static async verifyEmiPayment(req, res) {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      // Verify signature
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

      // Find EMI payment
      const emiPayment = await EmiPayment.findOne({
        where: { razorpayOrderId: razorpay_order_id }
      });

      if (!emiPayment) {
        return res.status(404).json({
          success: false,
          message: "EMI payment record not found"
        });
      }

      // ✅ Mark installment as paid
      await emiPayment.update({
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidDate: new Date()
      });

      // ✅ Update order's current EMI status
      const order = await Order.findByPk(emiPayment.orderId);
      const allEmiPayments = await EmiPayment.findAll({
        where: { orderId: order.id },
        order: [['installmentNumber', 'ASC']]
      });

      const paidCount = allEmiPayments.filter(e => e.status === 'paid').length;
      const nextUnpaid = allEmiPayments.find(e => e.status === 'pending');

      await order.update({
        currentEmiInstallment: paidCount,
        nextEmiDueDate: nextUnpaid ? nextUnpaid.dueDate : null,
        emiStatus: paidCount === allEmiPayments.length ? 'completed' : 'active'
      });

      // ✅ If this is the 1st installment, grant batch access
      if (emiPayment.installmentNumber === 1) {
        const batch = await Batch.findByPk(order.itemId);
        if (batch) {
          // Sync expiry dates
          await OrderController.syncBatchAccessExpiry(order, batch);

          // Grant child access (quizzes/tests)
          await OrderController.grantBatchChildAccess({
            userId: order.userId,
            batch,
            parentOrderId: order.id,
            isAdmin: false
          });
        }
      }

      // Clear cache
      await redis.del(`orders:${order.userId}`);

      return res.json({
        success: true,
        message: "EMI payment verified successfully",
        orderId: order.id,
        installmentNumber: emiPayment.installmentNumber,
        totalPaidInstallments: paidCount,
        nextDueDate: nextUnpaid?.dueDate || null
      });

    } catch (error) {
      console.error("EMI VERIFY ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "EMI payment verification failed",
        error: error.message
      });
    }
  }

  /**
   * ADMIN: BLOCK ACCESS FOR UNPAID EMI
   */
  static async blockAccessForUnpaidEmi(req, res) {
    try {
      const { orderId, reason } = req.body;

      if (!orderId) {
        return res.status(400).json({
          message: "orderId is required"
        });
      }

      const order = await Order.findByPk(orderId);
      if (!order || !order.isEmi) {
        return res.status(404).json({
          message: "EMI order not found"
        });
      }

      // Block parent order
      await order.update({
        enrollmentStatus: "suspended",
        reason: reason || "UNPAID_EMI"
      });

      // Block all child orders (quizzes/tests)
      await Order.update(
        {
          enrollmentStatus: "suspended",
          reason: "PARENT_EMI_BLOCKED"
        },
        {
          where: { parentOrderId: orderId }
        }
      );

      // Send notification
      await NotificationController.createNotification({
        userId: order.userId,
        title: "Course Access Suspended",
        message: "Your course access has been suspended due to unpaid EMI installment.",
        type: "warning",
        relatedId: orderId
      });

      await redis.del(`orders:${order.userId}`);

      return res.json({
        success: true,
        message: "Access blocked for unpaid EMI",
        order
      });

    } catch (error) {
      console.error("BLOCK ACCESS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to block access"
      });
    }
  }

  /**
   * ADMIN: RESTORE ACCESS AFTER EMI PAYMENT
   */
  static async restoreAccessAfterEmiPayment(req, res) {
    try {
      const { orderId } = req.body;

      const order = await Order.findByPk(orderId);
      if (!order) {
        return res.status(404).json({
          message: "Order not found"
        });
      }

      // Check if all required conditions are met
      const emiStatus = await OrderController.checkEmiAccessStatus(order);

      if (!emiStatus.canAccess) {
        return res.status(400).json({
          success: false,
          message: "Cannot restore access",
          reason: emiStatus.reason
        });
      }

      // Restore parent order
      await order.update({
        enrollmentStatus: "active",
        reason: "EMI_PAYMENT_RECEIVED"
      });

      // Restore all child orders
      await Order.update(
        {
          enrollmentStatus: "active",
          reason: "PARENT_EMI_RESTORED"
        },
        {
          where: { parentOrderId: orderId }
        }
      );

      // Notify user
      await NotificationController.createNotification({
        userId: order.userId,
        title: "Course Access Restored",
        message: "Your course access has been restored after EMI payment.",
        type: "success",
        relatedId: orderId
      });

      await redis.del(`orders:${order.userId}`);

      return res.json({
        success: true,
        message: "Access restored successfully",
        order
      });

    } catch (error) {
      console.error("RESTORE ACCESS ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to restore access"
      });
    }
  }

  // ============ ADMIN METHODS ============

  static async adminAssignCourse(req, res) {
    try {
      const {
        userId,
        type,
        itemId,
        accessValidityDays,
        reason
      } = req.body;

      if (!userId || !type || !itemId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create order with zero amount and success status
      const newOrder = await Order.create({
        userId,
        type,
        itemId,
        amount: 0,
        discount: 0,
        gst: 0,
        totalAmount: 0,
        razorpayOrderId: `admin_${Date.now()}`,
        razorpayPaymentId: null,
        razorpaySignature: null,
        status: "success",
        paymentDate: new Date(),
        accessValidityDays: accessValidityDays || null,
        enrollmentStatus: "active",
        couponId: null,
        reason: reason || "ADMIN_ASSIGNED",
        couponDiscount: null,
        couponDiscountType: null
      });

      // Send notification to user
      await NotificationController.createNotification({
        userId: userId,
        title: "Course Assigned by Admin",
        message: `You have been enrolled in a course by the administrator.`,
        type: "course",
        relatedId: newOrder.id,
      });

      if (type === "batch") {
        const batch = await Batch.findByPk(itemId);

        if (batch) {
          // Sync expiry
          await OrderController.syncBatchAccessExpiry(newOrder, batch);

          // Grant child access
          await OrderController.grantBatchChildAccess({
            userId,
            batch,
            parentOrderId: newOrder.id,
            isAdmin: true
          });
        }
      }

      // Clear cache
      await redis.del(`orders:${userId}`);

      return res.json({
        success: true,
        message: "Course assigned successfully",
        order: newOrder
      });

    } catch (error) {
      console.log("ADMIN ASSIGN ERROR:", error);
      return res.status(500).json({
        message: "Course assignment failed",
        error
      });
    }
  }

  static async adminReverseAssignCourse(req, res) {
    try {
      const { userId, orderId, reason } = req.body;

      if (!userId || !orderId) {
        return res.status(400).json({
          success: false,
          message: "userId and orderId are required"
        });
      }

      // Find only ADMIN assigned order
      const order = await Order.findOne({
        where: {
          id: orderId,
          userId,
          enrollmentStatus: "active"
        }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Active admin assigned course not found"
        });
      }

      // Safety: Paid orders should not be reversed
      if (order.amount > 0) {
        return res.status(403).json({
          success: false,
          message: "Paid orders cannot be reversed by admin"
        });
      }

      // Reverse assignment
      await order.update({
        enrollmentStatus: "cancelled",
        status: "failed",
        reason: reason || "ADMIN_REVERSED"
      });

      if (order.type === "batch") {
        const batch = await Batch.findByPk(order.itemId);

        if (batch) {
          const quizIds = batch.quizIds || [];
          const testSeriesIds = batch.testSeriesIds || [];

          await Order.update(
            {
              enrollmentStatus: "cancelled",
              status: "failed",
              reason: "BATCH_REVOKED"
            },
            {
              where: {
                userId,
                itemId: [...quizIds, ...testSeriesIds],
                type: { [Sequelize.Op.in]: ["quiz", "test"] }
              }
            }
          );
        }
      }

      // Notify user
      await NotificationController.createNotification({
        userId,
        title: "Course Access Revoked",
        message: "Your course access has been revoked by the administrator.",
        type: "course",
        relatedId: order.id
      });

      // Clear Redis cache
      await redis.del(`orders:${userId}`);
      await redis.del(`user:courses:${userId}`);

      return res.json({
        success: true,
        message: "Course access revoked successfully",
        order
      });

    } catch (error) {
      console.error("ADMIN REVERSE ASSIGN ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to revoke course",
        error: error.message
      });
    }
  }
}

module.exports = OrderController;