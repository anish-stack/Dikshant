const express = require("express");
const router = express.Router();

const bundleCtrl = require("../controllers/testSeriesBundle.controller");

// CRUD
router.post("/", bundleCtrl.create);
router.get("/", bundleCtrl.getAll);
router.get("/:id", bundleCtrl.getById);
router.put("/:id", bundleCtrl.update);
router.delete("/:id", bundleCtrl.remove);

module.exports = router;