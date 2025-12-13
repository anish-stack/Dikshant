'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/PageController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/", ctrl.findAll);

// Public: Get page by slug
router.get("/:slug", ctrl.findOne);

// Admin: create/update/delete
router.post("/", auth, role(["admin"]), ctrl.create);
router.put("/:id", auth, role(["admin"]), ctrl.update);
router.delete("/:id", auth, role(["admin"]), ctrl.delete);

module.exports = router;

