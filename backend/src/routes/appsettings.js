'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/AppSettingController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/", ctrl.findAll);
router.get("/:key", ctrl.findOne);

router.post("/", auth, role(["admin"]), ctrl.save);
router.put("/", auth, role(["admin"]), ctrl.save);   // same create/update
router.delete("/:id", auth, role(["admin"]), ctrl.delete);

module.exports = router;

