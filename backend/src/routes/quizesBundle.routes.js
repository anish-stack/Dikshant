"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/quizesBundle.controller");
const upload = require("../middleware/upload");

router.post("/", upload.single("image"), ctrl.createBundle);
router.get("/", ctrl.getAllBundles);
router.get("/slug/:slug", ctrl.getBundleBySlug);
router.get("/:id", ctrl.getBundleById);
router.put("/:id",  upload.single("image"),ctrl.updateBundle);
router.delete("/:id", ctrl.deleteBundle);

module.exports = router;