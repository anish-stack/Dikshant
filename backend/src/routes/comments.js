// routes/comments.js
const express = require("express");
const router = express.Router();
const CommentController = require("../controllers/CommentController");
const auth = require("../middleware/auth");

router.post("/", auth, CommentController.addComment);
router.post("/:commentId/toggle-like", auth, CommentController.toggleLike);
router.get("/admin-comment/:videoId",  CommentController.getAdminComments);

router.get("/video/:videoId", auth, CommentController.getComments);
router.delete("/:commentId", CommentController.deleteComment);
module.exports = router;