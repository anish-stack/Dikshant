'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/CourseProgressController");
const auth = require("../middleware/auth");


router.post("/", ctrl.updateProgress);
router.get("/:userId/batch/:batchId",  ctrl.getBatchProgress);
router.get("/:userId/batch/:batchId/summary",  ctrl.getBatchCompletion);

module.exports = router;


