'use strict';

const {
  StudyMaterialCategory,
  StudyMaterial,
  StudyMaterialPurchase,
  User
} = require('../models');

const redis = require('../config/redis');
const { generateSlug } = require('../utils/helpers');
const { Op, where } = require('sequelize');

const uploadToS3 = require("../utils/s3Upload");
const deleteFromS3 = require("../utils/s3Delete");

const NotificationController = require("./NotificationController");

const razorpay = require("../config/razorpay");
const crypto = require("crypto");

class StudyMaterialController {

  /* =======================================================
      CATEGORY CRUD (Complete)
  ======================================================= */

  static async createCategory(req, res) {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }

      const category = await StudyMaterialCategory.create({
        name,
        slug: generateSlug(name)
      });

      await redis.del("study_material_categories");

      return res.json({
        success: true,
        message: "Category created successfully",
        data: category
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, status } = req.body;

      const category = await StudyMaterialCategory.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      const updateData = {};
      if (name) {
        updateData.name = name;
        updateData.slug = generateSlug(name);
      }
      if (status) updateData.status = status;

      await category.update(updateData);

      await redis.del("study_material_categories");

      return res.json({
        success: true,
        message: "Category updated successfully",
        data: category
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const category = await StudyMaterialCategory.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      // Optional: Check if category has materials before deleting
      const materialCount = await StudyMaterial.count({ where: { categoryId: id } });
      if (materialCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete category. It contains study materials."
        });
      }

      await category.destroy();

      await redis.del("study_material_categories");

      return res.json({
        success: true,
        message: "Category deleted successfully"
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getCategories(req, res) {
    try {

      const isAdmin = req.query.admin === 'true';
      let categories;

      // ----------------------
      // ADMIN → NO CACHE
      // ----------------------
      if (isAdmin) {

        categories = await StudyMaterialCategory.findAll({
          order: [["name", "ASC"]],
        });

      } else {

        // ----------------------
        // USER → USE CACHE
        // ----------------------
        categories = await redis.get("study_material_categories");

        if (!categories) {

          categories = await StudyMaterialCategory.findAll({
            where: { status: "active" },
            order: [["name", "ASC"]],
          });

          await redis.set(
            "study_material_categories",
            JSON.stringify(categories),
            "EX",
            3600
          );

        } else {
          categories = JSON.parse(categories);
        }

      }

      return res.json({
        success: true,
        data: categories
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }

  static async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await StudyMaterialCategory.findByPk(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found"
        });
      }

      return res.json({
        success: true,
        data: category
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /* =======================================================
      STUDY MATERIAL CRUD (Complete)
  ======================================================= */

  static async createMaterial(req, res) {
    try {
      const {
        title,
        description,
        categoryId,
        isPaid,
        price
      } = req.body;

      if (!title || !categoryId) {
        return res.status(400).json({
          success: false,
          message: "Title and Category are required"
        });
      }

      let fileUrl = null;
      let coverImage = null;

      if (req.files?.pdf) {
        fileUrl = await uploadToS3(req.files.pdf[0], "study-materials");
      }

      if (req.files?.image) {
        coverImage = await uploadToS3(req.files.image[0], "study-materials");
      }

      const material = await StudyMaterial.create({
        title,
        slug: generateSlug(title),
        description,
        fileUrl,
        coverImage,
        categoryId,
        isPaid: isPaid === "true" || isPaid === true,
        price: isPaid === "true" || isPaid === true ? (price || 0) : 0
      });

      await redis.del("study_materials");

      return res.json({
        success: true,
        message: "Study material created successfully",
        data: material
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async updateMaterial(req, res) {
    try {
      const material = await StudyMaterial.findByPk(req.params.id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Study material not found"
        });
      }

      let fileUrl = material.fileUrl;
      let coverImage = material.coverImage;

      if (req.files?.pdf) {
        if (fileUrl) await deleteFromS3(fileUrl);
        fileUrl = await uploadToS3(req.files.pdf[0], "study-materials");
      }

      if (req.files?.image) {
        if (coverImage) await deleteFromS3(coverImage);
        coverImage = await uploadToS3(req.files.image[0], "study-materials");
      }

      await material.update({
        title: req.body.title ?? material.title,
        description: req.body.description ?? material.description,
        categoryId: req.body.categoryId ?? material.categoryId,
        isPaid: req.body.isPaid !== undefined ? (req.body.isPaid === "true" || req.body.isPaid === true) : material.isPaid,
        price: req.body.price ?? material.price,
        fileUrl,
        coverImage
      });

      await redis.del("study_materials");

      return res.json({
        success: true,
        message: "Study material updated successfully",
        data: material
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async deleteMaterial(req, res) {
    try {
      const material = await StudyMaterial.findByPk(req.params.id);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Study material not found"
        });
      }

      if (material.fileUrl) await deleteFromS3(material.fileUrl);
      if (material.coverImage) await deleteFromS3(material.coverImage);

      await material.destroy();

      await redis.del("study_materials");

      return res.json({
        success: true,
        message: "Study material deleted successfully"
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get All Study Materials (with optional filters)
  static async getAllMaterials(req, res) {
    try {
      const { categoryId, isPaid, search, page = 1, limit = 20 } = req.query;

      const where = {};
      if (categoryId) where.categoryId = categoryId;
      if (isPaid !== undefined) where.isPaid = isPaid === "true";

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (page - 1) * limit;

      const { count, rows: materials } = await StudyMaterial.findAndCountAll({
        where,
        include: [{
          model: StudyMaterialCategory,
          as: "category",
          attributes: ['id', 'name', 'slug']
        }],
        order: [['position', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.json({
        success: true,
        data: materials,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getMaterialById(req, res) {
    try {
      const { id } = req.params;

      const material = await StudyMaterial.findByPk(id, {
        include: [{
          model: StudyMaterialCategory,
          as: "category",
          attributes: ['id', 'name', 'slug']
        }]
      });

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Study material not found"
        });
      }

      return res.json({
        success: true,
        data: material
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
static async getMaterialByCatId(req, res) {
  try {

    const { id } = req.params;
    const userId = req.user?.id;

    const materials = await StudyMaterial.findAll({
      where: { categoryId: id },
      include: [{
        model: StudyMaterialCategory,
        as: "category",
        attributes: ["id", "name", "slug"]
      }]
    });

    if (!materials || materials.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Study material not found"
      });
    }

    let purchasedMaterialIds = [];

    if (userId) {

      const purchases = await StudyMaterialPurchase.findAll({
        where: { userId },
        attributes: ["materialId"]
      });

      purchasedMaterialIds = purchases.map(p => p.materialId);

    }

    const materialsWithStatus = materials.map(material => {

      const item = material.toJSON();

      item.alreadyPurchased = purchasedMaterialIds.includes(material.id);

      return item;

    });

    return res.json({
      success: true,
      data: materialsWithStatus
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }
}

  /* =======================================================
      ASSIGN FREE MATERIAL BY ADMIN
  ======================================================= */

  static async assignMaterial(req, res) {
    try {

      const { userId, materialId, accessType = "lifetime", expiryDate } = req.body;

      const material = await StudyMaterial.findByPk(materialId);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Study material not found"
        });
      }

      const existingPurchase = await StudyMaterialPurchase.findOne({
        where: { userId, materialId }
      });

      if (existingPurchase) {
        return res.status(400).json({
          success: false,
          message: "Material already assigned to this user"
        });
      }

      const purchase = await StudyMaterialPurchase.create({

        userId,
        materialId,

        paymentId: "admin-assigned",
        orderId: null,

        paymentStatus: "paid",
        purchasePrice: 0,
        currency: "INR",

        accessType: accessType,

        purchaseDate: new Date(),

        expiryDate: accessType === "limited" ? expiryDate : null,

        isActive: true,
        notes: "Assigned by admin"

      });


      await NotificationController.createNotification({
        userId,
        title: "Study Material Assigned",
        message: `You have received ${material.title}`,
        type: "study_material",
        relatedId: material.id
      });


      return res.json({
        success: true,
        message: "Material assigned successfully",
        data: purchase
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
  /* =======================================================
      BUY STUDY MATERIAL
  ======================================================= */

  static async createOrder(req, res) {
    try {

      const { materialId } = req.body;

      const material = await StudyMaterial.findByPk(materialId);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Material not found"
        });
      }

      if (!material.isPaid) {
        return res.status(400).json({
          success: false,
          message: "This material is free"
        });
      }

      const existingPurchase = await StudyMaterialPurchase.findOne({
        where: {
          userId: req.user.id,
          materialId
        }
      });

      if (existingPurchase) {
        return res.status(400).json({
          success: false,
          message: "Material already purchased"
        });
      }

      const order = await razorpay.orders.create({
        amount: material.price * 100,
        currency: "INR",
        receipt: `material_${material.id}_${Date.now()}`,
        notes: {
          userId: req.user.id,
          materialId: material.id
        }
      });

      return res.json({
        success: true,
        message: "Order created successfully",
        data: {
          orderId: order.id,
          key: process.env.RAZORPAY_KEY,
          amount: order.amount,
          currency: order.currency,
          materialId: material.id,
          materialTitle: material.title
        }
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }

  static async verifyPayment(req, res) {
    try {

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        materialId
      } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment signature"
        });
      }

      const material = await StudyMaterial.findByPk(materialId);

      if (!material) {
        return res.status(404).json({
          success: false,
          message: "Material not found"
        });
      }

      const existingPurchase = await StudyMaterialPurchase.findOne({
        where: {
          userId: req.user.id,
          materialId
        }
      });

      if (existingPurchase) {
        return res.status(400).json({
          success: false,
          message: "Material already purchased"
        });
      }

      const purchase = await StudyMaterialPurchase.create({

        userId: req.user.id,
        materialId,

        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,

        paymentStatus: "paid",
        purchasePrice: material.price,
        currency: "INR",

        purchaseDate: new Date(),

        accessType: "lifetime",
        expiryDate: null,

        isActive: true,
        deviceLimit: 1,

        notes: "Purchased via Razorpay"

      });

      await NotificationController.createNotification({
        userId: req.user.id,
        title: "Study Material Purchased",
        message: `You purchased ${material.title}`,
        type: "study_material",
        relatedId: materialId
      });

      return res.json({
        success: true,
        message: "Payment verified successfully",
        data: purchase
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }

  /* =======================================================
      USER MATERIAL ACCESS
  ======================================================= */

  static async getUserMaterials(req, res) {
    try {
      const purchases = await StudyMaterialPurchase.findAll({
        where: { userId: req.user.id },
        include: [
          {
            model: StudyMaterial,
            as: "material",
            include: [{
              model: StudyMaterialCategory,
              as: "category",
              attributes: ['name']
            }]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        success: true,
        data: purchases
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  static async getAllPurchase(req, res) {
    try {

      const purchases = await StudyMaterialPurchase.findAll({

        include: [

          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"]
          },

          {
            model: StudyMaterial,
            as: "material",

            attributes: ["id", "title", "price", "isPaid"],

            include: [
              {
                model: StudyMaterialCategory,
                as: "category",
                attributes: ["id", "name"]
              }
            ]
          }

        ],

        order: [["createdAt", "DESC"]]

      });

      return res.json({
        success: true,
        count: purchases.length,
        data: purchases
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }



  static async getStatsForAppUser(req, res) {
    try {

      // total materials
      const totalMaterials = await StudyMaterial.count({
        where: { status: "active" }
      });

      // total categories
      const totalCategories = await StudyMaterialCategory.count({
        where: { status: "active" }
      });

      // total notes
      const totalNotes = await StudyMaterial.count({
        include: [{
          model: StudyMaterialCategory,
          as: "category",
          where: { name: "Notes" },
          attributes: []
        }]
      });

      // total practice pdf
      const totalPracticePDF = await StudyMaterial.count({
        include: [{
          model: StudyMaterialCategory,
          as: "category",
          where: { name: "Practice PDF" },
          attributes: []
        }]
      });

      // total magazine
      const totalMagazine = await StudyMaterial.count({
        include: [{
          model: StudyMaterialCategory,
          as: "category",
          where: { name: "Magazine" },
          attributes: []
        }]
      });

      // featured materials
      const totalFeaturedMaterials = await StudyMaterial.findAll({
        where: {
          status: "active",
          featured: true
        }
      });

      return res.json({
        success: true,
        data: {
          totalMaterials,
          totalCategories,
          totalNotes,
          totalPracticePDF,
          totalMagazine,
          totalFeaturedMaterials
        }
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: error.message
      });

    }
  }
}

module.exports = StudyMaterialController;