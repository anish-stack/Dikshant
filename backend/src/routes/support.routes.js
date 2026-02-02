const express = require("express");
const router = express.Router();
const supportController = require("../controllers/support.controller");

// Public
router.post("/", supportController.create);

// Admin
router.get("/", supportController.findAll);
router.get("/:id", supportController.findOne);
router.put("/:id", supportController.update);
router.delete("/:id", supportController.delete);

module.exports = router;
