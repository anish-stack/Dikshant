"use strict";

const { Order, Coupon, Batch, Program, Subject, Sequelize } = require("../models");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");
const razorpay = require("../config/razorpay");


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

      /* 🧾 DB Order */
      const newOrder = await Order.create({
        userId,
        type,
        itemId,
        amount,
        discount,
        gst,
        totalAmount,
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


  // VERIFY PAYMENT
  static async verifyPayment(req, res) {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      } = req.body;

      const order = await Order.findOne({ where: { razorpayOrderId } });

      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // ✅ Critical: Payment update
      await order.update({
        razorpayPaymentId,
        razorpaySignature,
        status: "success",
        paymentDate: new Date(),
      });

      // ✅ Non-critical: Notification (isolated)
      try {
        await NotificationController.createNotification({
          userId: order.userId,
          title: "Payment Successful & Enrollment Confirmed",
          message: "Your payment was successful and you have been enrolled in the course.",
          type: "course",
          relatedId: order.id,
        });
      } catch (notifyErr) {
        console.error("⚠️ Notification failed:", notifyErr);
        // ❌ DO NOT throw
      }

      // ✅ Non-critical: Redis cleanup
      try {
        await redis.del(`orders:${order.userId}`);
      } catch (redisErr) {
        console.error("⚠️ Redis cleanup failed:", redisErr);
      }

      return res.json({
        success: true,
        message: "Payment verified",
        order,
        relatedId: order.itemId,
      });

    } catch (e) {
      console.error("❌ Payment verification failed:", e);
      return res.status(500).json({
        message: "Payment verification failed",
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
    console.log("🟡 ALREADY PURCHASED API HIT");
    console.log("➡️ QUERY:", req.query);
    console.log("➡️ USER:", req.user?.id);

    try {
      const userId = req.user?.id || req.query.userId;
      const { itemId, type } = req.query;

      console.log("📦 Parsed Fields:", { userId, itemId, type });

      if (!userId || !itemId || !type) {
        console.warn("❌ Missing required fields");
        return res.status(400).json({
          success: false,
          message: "userId, itemId and type are required",
        });
      }

      console.log("🔍 Checking successful order in DB...");

      const order = await Order.findOne({
        where: {
          userId,
          itemId,
          type,
          status: "success", 
        },
      });
      console.log("✅ Already Purchased:", order);
      if (order) {
        console.log("✅ Already Purchased:", order.id);
        return res.json({
          success: true,
          purchased: true,
          orderId: order.id,
          paymentDate: order.paymentDate,
          totalAmount: order.totalAmount,
          couponCode: order.couponCode,
        });
      }

      console.log("ℹ️ Not Purchased Yet");

      return res.json({
        success: true,
        purchased: false,
      });

    } catch (error) {
      console.error("🔥 ALREADY PURCHASED ERROR FULL:", {
        message: error.message,
        stack: error.stack,
      });

      return res.status(500).json({
        success: false,
        message: "Failed to check purchase status",
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