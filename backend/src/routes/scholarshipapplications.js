'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/ScholarshipApplicationController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

const upload = require("../middleware/upload");


router.post("/", auth, upload.fields([
    { name: "certificate", maxCount: 1 },
    { name: "photo", maxCount: 1 },
]), ctrl.apply);

router.get("/get-all-scholarship",ctrl.allScholarshipApply)
router.get("/user/:userId", auth, ctrl.listByUser);
router.get("/scholarship/:scholarshipId", auth, role(["admin"]), ctrl.listByScholarship);
router.put("/:id/status", auth, role(["admin"]), ctrl.updateStatus);
router.delete("/:id", auth, ctrl.deleteApplication);
module.exports = router;

