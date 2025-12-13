'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/ScholarshipApplicationController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");


router.post("/", auth, ctrl.apply);
router.get("/user/:userId", auth, ctrl.listByUser);
router.get("/scholarship/:scholarshipId", auth, role(["admin"]), ctrl.listByScholarship);
router.put("/:id/status", auth, role(["admin"]), ctrl.updateStatus);
router.delete("/:id", auth, ctrl.deleteApplication);
module.exports = router;

