const { Comment, CommentLike } = require("../models");

class CommentController {

  static async addComment(req, res) {
    try {
      const { videoId, text, parentId } = req.body;
      const userId = req.user?.id || req.body.userId;
      const userName = req.user?.name || req.body.userName || "Student";

      if (!videoId || !text?.trim()) {
        return res.status(400).json({ success: false, message: "videoId and text are required" });
      }

      const comment = await Comment.create({
        videoId,
        userId,
        userName,
        text: text.trim(),
        parentId: parentId || null,
      });

      const plainComment = comment.get({ plain: true });
      plainComment.replies = []; 

      return res.status(201).json({
        success: true,
        message: parentId ? "Reply added" : "Comment added",
        data: plainComment,
      });
    } catch (error) {
      console.error("addComment error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async toggleLike(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id || req.body.userId;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const comment = await Comment.findByPk(commentId);
      if (!comment || comment.isDeleted) {
        return res.status(404).json({ success: false, message: "Comment not found" });
      }

      const existingLike = await CommentLike.findOne({
        where: { commentId, userId },
      });

      if (existingLike) {
        await existingLike.destroy();
        await comment.decrement("likes");

        return res.json({
          success: true,
          action: "unliked",
          data: { likes: comment.likes - 1 },
        });
      } else {
        await CommentLike.create({ commentId, userId });
        await comment.increment("likes");

        return res.json({
          success: true,
          action: "liked",
          data: { likes: comment.likes + 1 },
        });
      }
    } catch (error) {
      console.error("toggleLike error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async getComments(req, res) {
    try {
      const { videoId } = req.params;
      const userId = req.user?.id || req.query.userId; 
      const limit = parseInt(req.query.limit) || 100;

      const comments = await Comment.findAll({
        where: { videoId, isDeleted: false },
        order: [["createdAt", "DESC"]],
        limit,
      });

      const plainComments = comments.map((c) => c.get({ plain: true }));

      let likedCommentIds = [];
      if (userId) {
        const likes = await CommentLike.findAll({
          where: { userId, commentId: plainComments.map((c) => c.id) },
          attributes: ["commentId"],
        });
        likedCommentIds = likes.map((l) => l.commentId);
      }

      const nestedComments = plainComments.reduce((acc, comment) => {
        comment.replies = plainComments.filter((c) => c.parentId === comment.id);
        comment.isLikedByUser = likedCommentIds.includes(comment.id);
        if (!comment.parentId) acc.push(comment);
        return acc;
      }, []);

      return res.json({
        success: true,
        data: nestedComments,
      });
    } catch (error) {
      console.error("getComments error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  static async deleteComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        return res.status(404).json({ success: false, message: "Comment not found" });
      }

      if (comment.userId !== userId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }

      comment.isDeleted = true;
      await comment.save();

      return res.json({ success: true, message: "Comment deleted" });
    } catch (error) {
      console.error("deleteComment error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

 static async getAdminComments(req, res) {
  try {
    const { videoId } = req.params;
    const limit = parseInt(req.query.limit) || 500;

    if (!videoId) {
      return res.status(400).json({ success: false, message: "videoId is required" });
    }

    // 1️⃣ Fetch comments
    const comments = await Comment.findAll({
      where: { videoId, isDeleted: false },
      order: [["createdAt", "DESC"]],
      limit,
    });

    const plainComments = comments.map((c) => c.get({ plain: true }));

    // 2️⃣ Build nested structure
    const commentMap = {};
    plainComments.forEach((c) => {
      c.replies = [];
      commentMap[c.id] = c;
    });

    const nestedComments = [];
    plainComments.forEach((c) => {
      if (c.parentId) {
        // attach reply to parent
        if (commentMap[c.parentId]) commentMap[c.parentId].replies.push(c);
      } else {
        nestedComments.push(c);
      }
    });

    return res.json({
      success: true,
      data: nestedComments,
    });
  } catch (error) {
    console.error("getAdminComments error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

}

module.exports = CommentController;