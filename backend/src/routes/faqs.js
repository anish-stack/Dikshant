'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/FAQController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/", ctrl.findAll);
router.get("/:id", ctrl.findOne);

router.post("/", auth, role(["admin"]), ctrl.create);
router.put("/:id", auth, role(["admin"]), ctrl.update);
router.delete("/:id", auth, role(["admin"]), ctrl.delete);

module.exports = router;

