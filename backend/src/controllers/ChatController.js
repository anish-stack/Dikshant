const { ChatMessage, User } = require("../models");

class ChatController {
  // ============================
  // SAVE MESSAGE
  // ============================
  static async saveMessage(data) {
    try {
      const message = await ChatMessage.create({
        videoId: data.videoId,
        userId: data.userId,
        userName: data.userName,
        message: data.message,
        messageType: "message",
        isFromTeacher: data.isFromTeacher || false,
        meta: data.meta || null,
      });

      const plainMessage = message.get({ plain: true });

      return {
        success: true,
        data: plainMessage,
      };
    } catch (error) {
      console.error("saveMessage error:", error.message);

      return {
        success: false,
        fallback: {
          id: `fallback-${Date.now()}`,
          videoId: data.videoId,
          userId: data.userId,
          userName: data.userName,
          message: data.message,
          messageType: "message",
          isFromTeacher: data.isFromTeacher || false,
          meta: data.meta || null,
          createdAt: new Date(),
        },
      };
    }
  }

  // ============================
  // SAVE JOIN
  // ============================
  static async saveJoin({ videoId, userId, userName }) {
    try {
      const existingJoin = await ChatMessage.findOne({
        where: {
          videoId,
          userId,
          messageType: "join",
        },
        order: [["createdAt", "ASC"]],
      });

      if (existingJoin) {
        return {
          success: true,
          data: existingJoin.get({ plain: true }),
          rejoined: true,
        };
      }

      const joinEvent = await ChatMessage.create({
        videoId,
        userId,
        userName,
        message: `${userName} joined the chat`,
        messageType: "join",
      });

      return {
        success: true,
        data: joinEvent.get({ plain: true }),
        rejoined: false,
      };
    } catch (error) {
      console.error("saveJoin error:", error.message);
      return { success: false };
    }
  }

  // ============================
  // SAVE LEAVE
  // ============================
  static async saveLeave({ videoId, userId, userName }) {
    try {
      const leaveEvent = await ChatMessage.create({
        videoId,
        userId,
        userName,
        message: `${userName} left the chat`,
        messageType: "leave",
      });

      return {
        success: true,
        data: leaveEvent.get({ plain: true }),
      };
    } catch (error) {
      console.error("saveLeave error:", error.message);
      return { success: false };
    }
  }

  // ============================
  // GET CHAT HISTORY
  // ============================

  static async getChatHistory(videoId, limit = 500) {
    try {
      const messages = await ChatMessage.findAll({
        where: { videoId },
        order: [["createdAt", "ASC"]],
        limit,
        raw: true,
      });

      // 🔍 Find messages where userName === "Student"
      const userIdsToFetch = [
        ...new Set(
          messages
            .filter(m => m.userName === "Student" && m.userId)
            .map(m => m.userId)
        )
      ];

      // 🧠 Fetch all required users in ONE query
      let userMap = {};
      if (userIdsToFetch.length > 0) {
        const users = await User.findAll({
          where: { id: userIdsToFetch },
          attributes: ["id", "name"],
          raw: true,
        });

        users.forEach(user => {
          userMap[user.id] = user.name;
        });
      }

      const updatedMessages = messages.map(m => ({
        ...m,
        userName:
          m.userName === "Student" && userMap[m.userId]
            ? userMap[m.userId]
            : m.userName,
      }));

      return {
        success: true,
        data: updatedMessages,
      };

    } catch (error) {
      console.error("getChatHistory error:", error.message);
      return {
        success: false,
        data: [],
      };
    }
  }

  // ============================
  // ADMIN MESSAGE (FIXED - NO CIRCULAR IMPORT)
  // ============================
  static async adminMessage(req, res) {
    try {
      const { videoId = "15", message } = req.body;

      if (!message) {
        return res.status(400).json({ success: false, message: "Message is required" });
      }

      const adminMsgResult = await ChatController.saveMessage({
        videoId,
        userId: "admin",
        userName: "Admin",
        message,
        isFromTeacher: true,
        messageType: "message", // ya "admin" rakh sakte ho agar alag handle karna ho
      });

      const adminMsg = adminMsgResult.success
        ? adminMsgResult.data
        : adminMsgResult.fallback;

      // Dynamic require to avoid circular dependency
      const { getIO } = require("../socket");
      const io = getIO();

      io.to(videoId).emit("admin-message", {
        ...adminMsg,
        userName: "Admin",
        isFromTeacher: true,
      });

      return res.json({ success: true, data: adminMsg });
    } catch (error) {
      console.error("sendAdminMessage error:", error.message);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  }


  // ============================
  // GET UNIQUE JOINED STUDENTS COUNT
  // ============================

  static async getUsersChatStatus(req, res) {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "videoId required",
        });
      }

      const events = await ChatMessage.findAll({
        where: {
          videoId,
          messageType: ["join", "leave"],
        },
        order: [["createdAt", "ASC"]],
        raw: true,
      });

      const usersMap = {};

      for (const event of events) {
        const uid = event.userId;

        if (!usersMap[uid]) {
          usersMap[uid] = {
            userId: uid,
            userName: event.userName,
            joinCount: 0,
            leaveCount: 0,
            latestStatus: null,
            lastActionAt: null,
          };
        }

        if (event.messageType === "join") {
          usersMap[uid].joinCount += 1;
          usersMap[uid].latestStatus = "joined";
        }

        if (event.messageType === "leave") {
          usersMap[uid].leaveCount += 1;
          usersMap[uid].latestStatus = "left";
        }

        usersMap[uid].lastActionAt = event.createdAt;
      }

      const result = Object.values(usersMap);

      return res.json({
        success: true,
        videoId,
        totalUsers: result.length,
        users: result,
      });
    } catch (error) {
      console.error("getUsersChatStatus error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users chat status",
      });
    }
  }

  static async getAllChatsaMessageFromVideo(req, res) {
    try {

      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "videoId required",
        });
      }

      const events = await ChatMessage.findAll({
        where: {
          videoId,
          messageType: ["message"],
        },
        order: [["createdAt", "ASC"]],
        raw: true,
      });

    } catch (error) {

    }
  }
  static async getAllChatsMessageFromVideo(req, res) {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "videoId required",
        });
      }

      const messages = await ChatMessage.findAll({
        where: {
          videoId,
          messageType: "message",
        },
        order: [["createdAt", "ASC"]],
        raw: true,
      });

      // Collect unique userIds
      const userIds = [...new Set(messages.map((m) => m.userId))];

      // Fetch users
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ["id", "name"],
        raw: true,
      });

      const userMap = {};
      users.forEach((u) => (userMap[u.id] = u.name));

      const formatted = messages.map((msg) => ({
        ...msg,
        userName: userMap[msg.userId] || msg.userName || "Unknown",
      }));

      return res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (error) {
      console.error("getAllChatsMessageFromVideo error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

}

module.exports = ChatController;