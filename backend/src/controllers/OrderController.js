"use strict";

const { Order, Coupon, Batch, Program, Subject, Sequelize } = require("../models");
const razorpay = require("../config/razorpay");
const redis = require("../config/redis");
const NotificationController = require("./NotificationController");

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
      key_secret: process.env.RAZORPAY_KEY_SECRET ? "✅ YES" : "❌ NO"
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

  // VERIFY PAYMENT
  static async verifyPayment(req, res) {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      } = req.body;
      const order = await Order.findOne({ where: { razorpayOrderId } });

      if (!order)
        return res.status(404).json({ message: "Order not found" });

      await order.update({
        razorpayPaymentId,
        razorpaySignature,
        status: "success",
        paymentDate: new Date()
      });

      await NotificationController.createNotification({
        userId: order.userId,
        title: "Payment Successful & Enrollment Confirmed",
        message: `Your payment was successful and you have been enrolled in the course.`,
        type: "course",
        relatedId: order.id,
      });
      
      await redis.del(`orders:${order.userId}`);

      return res.json({ success: true, message: "Payment verified", order });

    } catch (e) {
      console.log(e);
      return res.status(500).json({ message: "Payment verification failed", e });
    }
  }

  // USER ORDERS
  static async userOrders(req, res) {
    try {
      const userId = req.params.userId;

      const orders = await Order.findAll({
        where: { userId },
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