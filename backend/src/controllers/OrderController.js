"use strict";

const { Order, Coupon, Batch, Program, Subject, QuizPayments, Quizzes, TestSeries,Sequelize } = require("../models");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");
const razorpay = require("../config/razorpay");

const crypto = require("crypto");
class OrderController {

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


      let quiz = null

      /* 🎯 If order is for QUIZ, save in quiz_payments */
      if (type === "quiz") {
        console.log("🎯 Quiz order detected, saving QuizPayments entry");
        let quiz = await Quizzes.findByPk(itemId);

        if (!quiz) {
          console.warn("❌ Quiz not found for QuizPayments");
          return res.status(404).json({ message: "Quiz not found" });
        }
        console.log("📘 Quiz Found:", quiz);
        await QuizPayments.create({
          userId: userId,
          quizId: itemId,               // itemId = quizId
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

  // ADMIN: ASSIGN COURSE WITHOUT PAYMENT
  static async adminAssignCourse(req, res) {
    try {
      const {
        userId,
        type,          // batch / test
        itemId,
        accessValidityDays,
        reason         // Optional: reason for free assignment
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

      // 🔍 Find only ADMIN assigned order
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

      // ❌ Safety: Paid orders should not be reversed
      if (order.amount > 0) {
        return res.status(403).json({
          success: false,
          message: "Paid orders cannot be reversed by admin"
        });
      }

      // 🔁 Reverse assignment
      await order.update({
        enrollmentStatus: "cancelled",
        status: "failed",
        reason: reason || "ADMIN_REVERSED"
      });

      // 🔔 Notify user
      await NotificationController.createNotification({
        userId,
        title: "Course Access Revoked",
        message: "Your course access has been revoked by the administrator.",
        type: "course",
        relatedId: order.id
      });

      // 🧹 Clear Redis cache
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

      /* ✅ Update Order (IMPORTANT CHANGE HERE) */
      await order.update({
        status: "success", // ✅ VALID ENUM
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDate: new Date(),
      });

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


  // USER ORDERS
  static async userOrders(req, res) {
    try {
      const userId = req.params.userId;

      const orders = await Order.findAll({
        where: {
          userId,
          status: "success",
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

    /* ---------------- NOT PURCHASED ---------------- */
    if (!order) {
      return res.json({
        success: true,
        purchased: false,
      });
    }

    /* ---------------- BASE RESPONSE ---------------- */
    const response = {
      success: true,
      purchased: true,
      orderId: order.id,
      paymentDate: order.paymentDate,
      totalAmount: order.totalAmount,
      couponCode: order.couponCode,
    };

    /* =====================================================
       🧠 QUIZ LOGIC
    ===================================================== */
    if (type === "quiz") {
      const quizLimit = order.quiz_limit ?? 0;
      const attemptsUsed = order.quiz_attempts_used ?? 0;

      const remainingAttempts =
        quizLimit > 0 ? Math.max(quizLimit - attemptsUsed, 0) : 0;

      response.quizLimit = quizLimit;
      response.quizAttemptsUsed = attemptsUsed;
      response.remainingAttempts = remainingAttempts;
      response.canAttempt =
        quizLimit === 0 ? false : remainingAttempts > 0;

      if (!response.canAttempt) {
        response.message = "Quiz attempt limit reached";
      }
    }

    /* =====================================================
       📘 TEST SERIES LOGIC
    ===================================================== */
    if (type === "test") {
      const testSeries = await TestSeries.findByPk(itemId);

      if (!testSeries) {
        return res.status(404).json({
          success: false,
          message: "Test series not found",
        });
      }

      const now = new Date();
      const isExpired =
        testSeries.expirSeries &&
        new Date(testSeries.expirSeries) < now;

      response.testSeries = {
        id: testSeries.id,
        title: testSeries.title,
        expirSeries: testSeries.expirSeries,
      };

      response.canAccess = !isExpired;

      if (isExpired) {
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