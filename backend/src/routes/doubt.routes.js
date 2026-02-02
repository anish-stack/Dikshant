"use strict";

const express = require("express");
const router = express.Router();

const doubtController = require("../controllers/doubt.controller");
const auth = require("../middleware/auth");
/**
 * ======================================================
 * 🧑‍🎓 STUDENT ROUTES
 * ======================================================
 */

// ➕ Ask a doubt
router.post("/", auth, doubtController.createDoubt);
// 📄 Get my doubts
router.get("/my", auth, doubtController.getMyDoubts);
// 👍 Like a doubt
router.post("/:id/like", auth, doubtController.likeDoubt);

// 📄 Get all doubts (filter: status, courseId)
router.get("/admin/all",  doubtController.getAllDoubts);
// ✍️ Answer a doubt
router.post("/admin/:id/answer",  doubtController.answerDoubt);
// 🔒 Close a doubt
router.patch("/admin/:id/close",  doubtController.closeDoubt);

module.exports = router;
