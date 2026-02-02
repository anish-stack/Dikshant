const { getAppAssets, createAppAssets, updateAppAssets, deleteAppAssets } = require("../controllers/appAssets");
const { getAllCategories, getCategoryById, createCategory, updateCategory, softDeleteCategory, deleteCategoryPermanently, updateCategoryOrder } = require("../controllers/category.controller");

const router = require("express").Router();
const upload = require("../middleware/upload");


router.get("/", getAppAssets);
router.post("/", upload.fields([
  { name: "quizVideoIntro", maxCount: 1 },
  { name: "testSeriesVideoIntro", maxCount: 1 },
  { name: "onboardingImageOne", maxCount: 1 },
  { name: "onboardingImageTwo", maxCount: 1 },
  { name: "appLogo", maxCount: 1 },
])
    , createAppAssets);
router.put("/", upload.fields([
 { name: "quizVideoIntro", maxCount: 1 },
  { name: "testSeriesVideoIntro", maxCount: 1 },
  { name: "onboardingImageOne", maxCount: 1 },
  { name: "onboardingImageTwo", maxCount: 1 },
  { name: "appLogo", maxCount: 1 },
])
    , updateAppAssets);
router.delete("/", deleteAppAssets);



router.get("/category", getAllCategories);
router.get("/category/:id", getCategoryById);

// Admin
router.post("/category", createCategory);
router.put("/category/:id", updateCategory);
router.put("/category/disable/:id", softDeleteCategory);
router.delete("/category/:id", deleteCategoryPermanently);
router.put("/category/reorder/all", updateCategoryOrder);



module.exports = router;