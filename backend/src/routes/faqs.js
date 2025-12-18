'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/FAQController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/", ctrl.findAll);
router.get("/:id", ctrl.findOne);

router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.delete);

module.exports = router;

