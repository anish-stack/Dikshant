'use strict';

const express = require('express');
const router = express.Router();

const StudyMaterialController = require('../controllers/StudyMaterials');
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");


// ====================== CATEGORY ROUTES ======================

// Public Routes
router.get('/categories', StudyMaterialController.getCategories);
router.get('/categories/:id', StudyMaterialController.getCategoryById);

// Admin Only Routes
router.post('/categories', StudyMaterialController.createCategory);
router.put('/categories/:id', StudyMaterialController.updateCategory);
router.delete('/categories/:id', StudyMaterialController.deleteCategory);


// ====================== STUDY MATERIAL ROUTES ======================

// Public Routes
router.get('/materials', StudyMaterialController.getAllMaterials);
router.get('/materials/:id', StudyMaterialController.getMaterialById);
router.get('/materials-cat/:id',auth, StudyMaterialController.getMaterialByCatId);


// Admin Only Routes (CRUD)
router.post(
    '/materials',
    upload.fields([
        { name: 'pdf', maxCount: 1 },
        { name: 'image', maxCount: 1 }
    ]),
    StudyMaterialController.createMaterial
);

router.put(
    '/materials/:id',
    upload.fields([
        { name: 'pdf', maxCount: 1 },
        { name: 'image', maxCount: 1 }
    ]),
    StudyMaterialController.updateMaterial
);

router.delete('/materials/:id', StudyMaterialController.deleteMaterial);

// Assign Free Material (Admin Only)
router.post('/materials/assign', StudyMaterialController.assignMaterial);


// ====================== PAYMENT & PURCHASE ROUTES ======================

// User Routes (Requires Authentication)
router.post('/materials/order', auth, StudyMaterialController.createOrder);
router.post('/materials/verify-payment', auth, StudyMaterialController.verifyPayment);

// Get User's Purchased/Assigned Materials
router.get('/my-materials', auth, StudyMaterialController.getUserMaterials);
router.get('/purchases',  StudyMaterialController.getAllPurchase);

router.get('/stats-for-user',  StudyMaterialController.getStatsForAppUser);




module.exports = router;