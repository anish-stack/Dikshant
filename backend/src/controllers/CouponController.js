"use strict";

const { Coupon } = require("../models");
const redis = require("../config/redis");

class CouponController {

  // CREATE COUPON
  static async create(req, res) {
    try {
      const payload = {
        code: req.body.code.toUpperCase(),
        discount: req.body.discount,
        discountType: req.body.discountType,
        minPurchase: req.body.minPurchase,
        maxDiscount: req.body.maxDiscount,
        validTill: req.body.validTill,
        isActive: req.body.isActive
      };

      const coupon = await Coupon.create(payload);

      await redis.del("coupons");

      return res.status(201).json(coupon);

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Coupon create failed", error });
    }
  }

  static async update(req, res) {
    try {
      const item = await Coupon.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Coupon not found" });

      const updates = [
        "code", "discount", "discountType",
        "minPurchase", "maxDiscount",
        "validTill", "isActive"
      ];

      updates.forEach(field => {
        if (req.body[field] !== undefined) {
          if (field === "code") {
            item[field] = req.body[field].toUpperCase();
          } else {
            item[field] = req.body[field];
          }
        }
      });

      await item.save();

      await redis.del("coupons");
      return res.json(item);

    } catch (error) {
      return res.status(500).json({ message: "Coupon update failed", error });
    }
  }

  // GET ALL COUPONS
  static async findAll(req, res) {
    try {
      const cached = await redis.get("coupons");
      if (cached) return res.json(JSON.parse(cached));

      const items = await Coupon.findAll();

      await redis.set("coupons", JSON.stringify(items), "EX", 120);

      return res.json(items);

    } catch (error) {
      return res.status(500).json({ message: "Coupon fetch failed", error });
    }
  }



  // APPLY COUPON
  static async apply(req, res) {
    try {
      const { code, amount } = req.body;

      const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });

      if (!coupon) return res.status(404).json({ message: "Invalid coupon" });

      if (!coupon.isActive) return res.status(400).json({ message: "Coupon is inactive" });

      const now = new Date();
      if (now > coupon.validTill)
        return res.status(400).json({ message: "Coupon expired" });

      if (coupon.minPurchase && amount < coupon.minPurchase)
        return res.status(400).json({
          message: `Minimum purchase required is ₹${coupon.minPurchase}`
        });

      let discountAmount = 0;

      if (coupon.discountType === "flat") {
        discountAmount = coupon.discount;
      }

      if (coupon.discountType === "percentage") {
        discountAmount = (amount * coupon.discount) / 100;
        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount)
          discountAmount = coupon.maxDiscount;
      }

      const finalAmount = amount - discountAmount;

      return res.json({
        success: true,
        coupon: coupon.code,
        discountAmount,
        finalAmount
      });

    } catch (error) {
      console.log(error);
      return res.status(500).json({ message: "Error applying coupon", error });
    }
  }



  // DELETE COUPON
  static async delete(req, res) {
    try {
      const item = await Coupon.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: "Coupon not found" });

      await item.destroy();

      await redis.del("coupons");
      return res.json({ message: "Coupon deleted" });

    } catch (error) {
      return res.status(500).json({ message: "Coupon delete failed", error });
    }
  }
}

module.exports = CouponController;
