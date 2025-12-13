'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/ScholarshipResultController");
const auth = require("../middleware/auth");


// router.post("/submit", auth, ctrl.submit);
// router.get("/:scholarshipId/user/:userId", auth, ctrl.getResult);/
// router.get("/summary/:scholarshipId/user/:userId", auth, ctrl.mobileSummary);
// router.get("/merit/:scholarshipId", auth, ctrl.getMeritList);
// router.get("/pdf/:scholarshipId/user/:userId", auth, ctrl.downloadPDF);

module.exports = router;


