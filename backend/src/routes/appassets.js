const { getAppAssets, createAppAssets, updateAppAssets, deleteAppAssets } = require("../controllers/appAssets");

const router = require("express").Router();
const upload = require("../middleware/upload");


router.get("/", getAppAssets);
router.post("/", upload.fields([
    { name: "quizVideoIntro", maxCount: 1 },
    { name: "testSeriesVideoIntro", maxCount: 1 },
    { name: "onboardingImageOne", maxCount: 1 },
    { name: "onboardingImageTwo", maxCount: 1 },
])
    , createAppAssets);
router.put("/", upload.fields([
    { name: "quizVideoIntro", maxCount: 1 },
    { name: "testSeriesVideoIntro", maxCount: 1 },
    { name: "onboardingImageOne", maxCount: 1 },
    { name: "onboardingImageTwo", maxCount: 1 },
])
    , updateAppAssets);
router.delete("/", deleteAppAssets);



module.exports = router;