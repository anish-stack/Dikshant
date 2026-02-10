const { ChatMessage, User } = require("../models");
const { Op } = require("sequelize");

class ChatController {
  // ============================
  // SAVE MESSAGE (Keep your existing logic)
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
  // SAVE JOIN (Keep your existing logic)
  // ============================
  static async saveJoin({ videoId, userId }) {
    try {
      if (!videoId || !userId) {
        console.log("🟥 [JOIN] Missing fields", { videoId, userId });
        return { success: false, message: "videoId and userId are required" };
      }

      console.log("🟦 [JOIN] Request", { videoId, userId });

      const existingJoin = await ChatMessage.findOne({
        where: { videoId, userId, messageType: "join" },
        order: [["createdAt", "ASC"]],
      });
      console.log(existingJoin);

      const userFetch = await User.findByPk(userId);
      const userName = userFetch?.name || "User";

      const joinEvent = await ChatMessage.create({
        videoId,
        userId,
        userName,
        message: `${userName} joined the chat`,
        messageType: "join",
      });

      console.log("🟩 [JOIN] Join saved", {
        videoId,
        userId,
        joinId: joinEvent.id,
        userName,
      });

      return {
        success: true,
        data: joinEvent.get({ plain: true }),
        rejoined: false,
      };
    } catch (error) {
      console.error("❌ [JOIN] saveJoin error:", error);
      return { success: false };
    }
  }

  // ============================
  // SAVE LEAVE (Keep your existing logic)
  // ============================
  static async saveLeave({ videoId, userId, userName }) {
    try {
      if (!videoId || !userId) {
        return { success: false, message: "videoId and userId are required" };
      }

      let finalName = userName;

      if (!finalName) {
        const userFetch = await User.findByPk(userId);
        finalName = userFetch?.name || "User";
      }

      const leaveEvent = await ChatMessage.create({
        videoId,
        userId,
        userName: finalName,
        message: `${finalName} left the chat`,
        messageType: "leave",
      });
      console.log(`${finalName} left the chat`);

      return {
        success: true,
        data: leaveEvent.get({ plain: true }),
      };
    } catch (error) {
      console.error("saveLeave error:", error);
      return { success: false };
    }
  }

  // ============================
  // SAVE JOIN API (HTTP Endpoint)
  // ============================
  static async saveJoinApi(req, res) {
    try {
      const { videoId, userId } = req.body;

      console.log("🟦 [JOIN API]", { videoId, userId });

      if (!videoId || !userId) {
        console.log("🟥 [JOIN API] Missing fields", { videoId, userId });
        return res.status(400).json({
          success: false,
          message: "videoId and userId are required",
        });
      }

      const userFetch = await User.findByPk(userId);
      const userName = userFetch?.name || "Student";

      // Create join event
      const joinEvent = await ChatMessage.create({
        videoId,
        userId,
        userName,
        message: `${userName} joined the chat`,
        messageType: "join",
      });

      // Get live watching count
      const liveCount = await ChatMessage.count({
        where: {
          videoId,
          messageType: "join",
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
          },
        },
        distinct: true,
        col: "userId",
      });

      console.log("🟩 [JOIN API] Join saved", {
        videoId,
        userId,
        joinId: joinEvent.id,
        userName,
        liveCount,
      });

      return res.json({
        success: true,
        data: joinEvent.get({ plain: true }),
        liveCount,
        rejoined: false,
      });
    } catch (error) {
      console.error("❌ [JOIN API] saveJoin error:", error);
      return res.status(500).json({ 
        success: false,
        liveCount: 0,
      });
    }
  }

  // ============================
  // SAVE LEAVE API (HTTP Endpoint)
  // ============================
static async saveLeaveApi(req, res) {
  try {
    const { videoId, userId } = req.body;

    console.log("🟨 [LEAVE API]", { videoId, userId });

    if (!videoId || !userId) {
      return res.status(400).json({
        success: false,
        message: "videoId and userId are required",
      });
    }

    const userFetch = await User.findByPk(userId);
    const userName = userFetch?.name || "Student";

    const leaveEvent = await ChatMessage.create({
      videoId,
      userId,
      userName,
      message: `${userName} left the chat`,
      messageType: "leave",
    });

    // ✅ Correct live count (latest join/leave per user)
    const events = await ChatMessage.findAll({
      where: {
        videoId,
        messageType: ["join", "leave"],
      },
      order: [["createdAt", "DESC"]],
      raw: true,
    });

    const usersMap = {};
    for (const e of events) {
      if (!usersMap[e.userId]) {
        usersMap[e.userId] = e.messageType;
      }
    }

    const liveCount = Object.values(usersMap).filter((s) => s === "join").length;

    console.log("🟧 [LEAVE API] Leave saved", {
      videoId,
      userId,
      leaveId: leaveEvent.id,
      userName,
      liveCount,
    });

    return res.json({
      success: true,
      data: leaveEvent,
      liveCount,
    });
  } catch (error) {
    console.error("❌ [LEAVE API] saveLeave error:", error);
    return res.status(500).json({
      success: false,
      liveCount: 0,
    });
  }
}


  // ============================
  // SAVE MESSAGE API (HTTP Endpoint)
  // ============================
  static async saveMessageApi(req, res) {
    try {
      const { videoId, userId, userName, message, isFromTeacher, meta, tempId } =
        req.body;

      console.log("💬 [MESSAGE API]", {
        videoId,
        userId,
        userName,
        messageLength: message?.length,
        tempId,
      });

      if (!videoId || !userId || !userName || !message) {
        return res.status(400).json({
          success: false,
          message: "videoId, userId, userName, message are required",
        });
      }

      // Message validation
      if (message.length > 600) {
        return res.status(400).json({
          success: false,
          message: "Message too long (max 600 characters)",
        });
      }

      // Save message
      const saved = await ChatMessage.create({
        videoId,
        userId,
        userName,
        message,
        messageType: "message",
        isFromTeacher: isFromTeacher || false,
        meta: meta || null,
      });

      const savedData = saved.get({ plain: true });

      console.log("✅ [MESSAGE API] Message saved", {
        messageId: savedData.id,
        tempId,
        videoId,
        userId,
      });

      return res.json({
        success: true,
        data: {
          ...savedData,
          tempId, // Echo back tempId for frontend matching
        },
      });
    } catch (error) {
      console.error("❌ [MESSAGE API] saveMessageApi error:", error);

      // Fallback response
      return res.status(200).json({
        success: false,
        error: error.message,
        fallback: {
          id: `fallback-${Date.now()}`,
          videoId: req.body?.videoId,
          userId: req.body?.userId,
          userName: req.body?.userName,
          message: req.body?.message,
          messageType: "message",
          isFromTeacher: req.body?.isFromTeacher || false,
          meta: req.body?.meta || null,
          tempId: req.body?.tempId,
          createdAt: new Date(),
        },
      });
    }
  }

  // ============================
  // GET CHAT HISTORY (Helper - Your existing logic with userMap)
  // ============================
  static async getChatHistoryHelper(videoId, limit = 500) {
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
            .filter((m) => m.userName === "Student" && m.userId)
            .map((m) => m.userId)
        ),
      ];

      // 🧠 Fetch all required users in ONE query
      let userMap = {};
      if (userIdsToFetch.length > 0) {
        const users = await User.findAll({
          where: { id: userIdsToFetch },
          attributes: ["id", "name"],
          raw: true,
        });

        users.forEach((user) => {
          userMap[user.id] = user.name;
        });
      }

      const updatedMessages = messages.map((m) => ({
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
      console.error("getChatHistoryHelper error:", error.message);
      return {
        success: false,
        data: [],
      };
    }
  }

  // ============================
  // GET CHAT HISTORY API (HTTP Endpoint with live count)
  // ============================
  static async getChatHistory(req, res) {
    try {
      const { videoId } = req.params;
      const limit = parseInt(req.query.limit) || 400;

      console.log("📜 [HISTORY API]", { videoId, limit });

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "videoId is required",
        });
      }

      // Use helper method with your existing userMap logic
      const historyResult = await ChatController.getChatHistoryHelper(
        videoId,
        limit
      );

      if (!historyResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to fetch chat history",
          data: [],
          liveCount: 0,
        });
      }

      // Get live count
      const liveCount = await ChatMessage.count({
        where: {
          videoId,
          messageType: "join",
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
          },
        },
        distinct: true,
        col: "userId",
      });

      console.log("✅ [HISTORY API] Fetched", {
        videoId,
        messageCount: historyResult.data.length,
        liveCount,
      });

      return res.json({
        success: true,
        data: historyResult.data,
        liveCount,
        total: historyResult.data.length,
      });
    } catch (error) {
      console.error("❌ [HISTORY API] getChatHistory error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        data: [],
        liveCount: 0,
      });
    }
  }

  // ============================
  // GET LIVE COUNT ONLY
  // ============================
  static async getLiveCount(req, res) {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "videoId is required",
        });
      }

      // Count unique users who joined in last 30 minutes
      const liveCount = await ChatMessage.count({
        where: {
          videoId,
          messageType: "join",
          createdAt: {
            [Op.gte]: new Date(Date.now() - 30 * 60 * 1000),
          },
        },
        distinct: true,
        col: "userId",
      });

      return res.json({
        success: true,
        liveCount,
        total: liveCount,
      });
    } catch (error) {
      console.error("❌ [LIVE COUNT API] error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
        liveCount: 0,
      });
    }
  }

  // ============================
  // ADMIN MESSAGE (Keep your existing logic)
  // ============================
static async adminMessage(req, res) {
  try {
    const { videoId = "15", message } = req.body;

    console.log("🟦 [ADMIN MESSAGE API] Request", {
      videoId,
      hasMessage: !!message,
      messageLength: message?.length || 0,
    });

    if (!message || !message.trim()) {
      console.log("🟥 [ADMIN MESSAGE API] Message missing");

      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // Save message in DB
    const adminMsgResult = await ChatController.saveMessage({
      videoId,
      userId: "admin",
      userName: "Admin",
      message: message.trim(),
      isFromTeacher: true,
      messageType: "message",
    });

    const adminMsg = adminMsgResult.success
      ? adminMsgResult.data
      : adminMsgResult.fallback;

    console.log("🟩 [ADMIN MESSAGE API] Message saved", {
      videoId,
      msgId: adminMsg?.id,
      fallbackUsed: !adminMsgResult.success,
    });

    // Emit socket safely
    try {
      const { getIO } = require("../socket");
      const io = getIO();

      if (io) {
        io.to(videoId).emit("admin-message", {
          ...adminMsg,
          userName: "Admin",
          isFromTeacher: true,
        });

        console.log("🟪 [ADMIN MESSAGE API] Socket emitted", {
          videoId,
          event: "admin-message",
        });
      } else {
        console.log("🟨 [ADMIN MESSAGE API] Socket not available");
      }
    } catch (socketErr) {
      console.error("⚠️ [ADMIN MESSAGE API] Socket emit failed:", socketErr);
      // socket fail hone pe bhi API success return karega (DB save already done)
    }

    return res.json({
      success: true,
      data: adminMsg,
    });
  } catch (error) {
    console.error("❌ [ADMIN MESSAGE API] Internal error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}


  // ============================
  // GET USERS CHAT STATUS (Keep your existing logic)
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
        },
        order: [["createdAt", "DESC"]], // latest first
        raw: true,
      });

      const usersMap = {};

      for (const event of events) {
        const uid = event.userId;

        if (!usersMap[uid]) {
          usersMap[uid] = {
            userId: uid,
            userName: event.userName,
            latestStatus: event.messageType === "join" ? "joined" : "left",
            lastActionAt: event.createdAt,
          };
        }
      }

      const result = Object.values(usersMap);

      return res.json({
        success: true,
        videoId,
        events,
        totalUsers: result.length,
        users: result,
      });
    } catch (error) {
      console.error("❌ getUsersChatStatus error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users chat status",
      });
    }
  }

  // ============================
  // GET ALL CHATS MESSAGE FROM VIDEO (Keep your existing logic)
  // ============================
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



    static async getChatAnalytics(req, res) {
    try {
      const { videoId } = req.params;

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: "videoId is required",
        });
      }

      // Get all events
      const allEvents = await ChatMessage.findAll({
        where: { videoId },
        order: [["createdAt", "ASC"]],
        raw: true,
      });

      const messages = allEvents.filter((e) => e.messageType === "message");
      const joins = allEvents.filter((e) => e.messageType === "join");
      const leaves = allEvents.filter((e) => e.messageType === "leave");

      // Time-based analytics
      const now = Date.now();
      const last5Min = new Date(now - 5 * 60 * 1000);
      const last10Min = new Date(now - 10 * 60 * 1000);
      const last30Min = new Date(now - 30 * 60 * 1000);
      const last1Hour = new Date(now - 60 * 60 * 1000);

      const analytics = {
        success: true,
        videoId,

        // Message analytics
        messages: {
          total: messages.length,
          last5Min: messages.filter((m) => new Date(m.createdAt) >= last5Min)
            .length,
          last10Min: messages.filter((m) => new Date(m.createdAt) >= last10Min)
            .length,
          last30Min: messages.filter((m) => new Date(m.createdAt) >= last30Min)
            .length,
          last1Hour: messages.filter((m) => new Date(m.createdAt) >= last1Hour)
            .length,
        },

        // User activity
        users: {
          totalJoins: joins.length,
          totalLeaves: leaves.length,
          uniqueUsers: new Set(allEvents.map((e) => e.userId)).size,
          joinsLast30Min: joins.filter((j) => new Date(j.createdAt) >= last30Min)
            .length,
          leavesLast30Min: leaves.filter(
            (l) => new Date(l.createdAt) >= last30Min
          ).length,
        },

        // Engagement rate
        engagement: {
          messagesPerUser:
            messages.length / new Set(messages.map((m) => m.userId)).size || 0,
          averageMessageLength:
            messages.reduce((sum, m) => sum + m.message.length, 0) /
              messages.length || 0,
        },

        // Peak activity time
        peakActivity: {
          mostActiveHour: null, // Can be calculated if needed
          messagesPerMinute: (messages.length / 60).toFixed(2),
        },

        timestamp: new Date().toISOString(),
      };

      return res.json(analytics);
    } catch (error) {
      console.error("❌ [CHAT ANALYTICS] error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch chat analytics",
        error: error.message,
      });
    }
  }
static async getCompleteChatData(req, res) {
  try {
    const { videoId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);

    console.log("📊 [COMPLETE CHAT DATA] Request", { videoId, limit });

    if (!videoId) {
      console.log("🟥 [COMPLETE CHAT DATA] Missing videoId");
      return res.status(400).json({
        success: false,
        message: "videoId is required",
      });
    }

    // ─────────────────────────────────────────────
    // 1) Fetch all events (messages + join + leave)
    // ─────────────────────────────────────────────
    const allEvents = await ChatMessage.findAll({
      where: { videoId },
      order: [["createdAt", "ASC"]],
      limit: limit * 3, // buffer
      raw: true,
    });

    // ─────────────────────────────────────────────
    // 2) Split messages vs join/leave
    // ─────────────────────────────────────────────
    const messages = [];
    const joinLeaveEvents = [];

    for (const e of allEvents) {
      if (e.messageType === "message") messages.push(e);
      if (e.messageType === "join" || e.messageType === "leave") {
        joinLeaveEvents.push(e);
      }
    }

    // ─────────────────────────────────────────────
    // 3) Collect userIds to resolve names
    // ─────────────────────────────────────────────
    const userIdsSet = new Set();

    // from messages
    for (const m of messages) {
      if (m.userId && (m.userName === "Student" || !m.userName)) {
        userIdsSet.add(m.userId);
      }
    }

    // from join/leave
    for (const e of joinLeaveEvents) {
      if (e.userId && (e.userName === "Student" || !e.userName)) {
        userIdsSet.add(e.userId);
      }
    }

    const userIdsToFetch = [...userIdsSet];

    let userMap = {};
    if (userIdsToFetch.length > 0) {
      const users = await User.findAll({
        where: { id: userIdsToFetch },
        attributes: ["id", "name"],
        raw: true,
      });

      for (const u of users) {
        userMap[u.id] = u.name;
      }
    }

    // helper
    const resolveName = (uid, fallback) => {
      if (!uid) return fallback || "User";
      if (fallback && fallback !== "Student") return fallback;
      return userMap[uid] || fallback || "User";
    };

    // ─────────────────────────────────────────────
    // 4) Resolve message userNames
    // ─────────────────────────────────────────────
    const resolvedMessages = messages.map((m) => ({
      ...m,
      userName: resolveName(m.userId, m.userName),
    }));

    // ─────────────────────────────────────────────
    // 5) Build users map (latest status + first joined)
    //    IMPORTANT: process DESC for latest status
    // ─────────────────────────────────────────────
    const usersMap = {};

    // latest first
    for (let i = joinLeaveEvents.length - 1; i >= 0; i--) {
      const event = joinLeaveEvents[i];
      const uid = event.userId;

      if (!uid) continue;

      if (!usersMap[uid]) {
        usersMap[uid] = {
          userId: uid,
          userName: resolveName(uid, event.userName),
          latestStatus: event.messageType === "join" ? "joined" : "left",
          lastActionAt: event.createdAt,
          firstJoinedAt: event.createdAt,
        };
      } else {
        // overwrite firstJoinedAt (going backwards in time)
        usersMap[uid].firstJoinedAt = event.createdAt;
      }
    }

    const allUsers = Object.values(usersMap);

    // ─────────────────────────────────────────────
    // 6) Active/Left users + correct liveCount
    // ─────────────────────────────────────────────
    const activeUsers = allUsers.filter((u) => u.latestStatus === "joined");
    const leftUsers = allUsers.filter((u) => u.latestStatus === "left");

    // ✅ Correct liveCount
    const liveCount = activeUsers.length;

    // ─────────────────────────────────────────────
    // 7) Message stats
    // ─────────────────────────────────────────────
    const now = Date.now();

    const messageStats = {
      totalMessages: resolvedMessages.length,
      messagesLast10Min: 0,
      messagesLast30Min: 0,
    };

    for (const m of resolvedMessages) {
      const t = new Date(m.createdAt).getTime();
      if (t >= now - 10 * 60 * 1000) messageStats.messagesLast10Min++;
      if (t >= now - 30 * 60 * 1000) messageStats.messagesLast30Min++;
    }

    // ─────────────────────────────────────────────
    // 8) Top active users
    // ─────────────────────────────────────────────
    const userMessageCounts = {};

    for (const m of resolvedMessages) {
      const uid = m.userId;
      if (!uid) continue;

      if (!userMessageCounts[uid]) {
        userMessageCounts[uid] = {
          userId: uid,
          userName: m.userName,
          messageCount: 0,
        };
      }

      userMessageCounts[uid].messageCount++;
    }

    const topActiveUsers = Object.values(userMessageCounts)
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    // ─────────────────────────────────────────────
    // 9) Response
    // ─────────────────────────────────────────────
    const response = {
      success: true,
      videoId,

      // Messages
      messages: resolvedMessages.slice(-limit),
      messageStats,

      // Users
      users: {
        all: allUsers,
        active: activeUsers,
        left: leftUsers,
        topActive: topActiveUsers,
      },

      // Counts
      counts: {
        liveCount,
        totalMessages: resolvedMessages.length,
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        leftUsers: leftUsers.length,
      },

      metadata: {
        limit,
        timestamp: new Date().toISOString(),
      },
    };

    console.log("✅ [COMPLETE CHAT DATA] Success", {
      videoId,
      totalMessages: resolvedMessages.length,
      liveCount,
      activeUsers: activeUsers.length,
      leftUsers: leftUsers.length,
    });

    return res.json(response);
  } catch (error) {
    console.error("❌ [COMPLETE CHAT DATA] error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch complete chat data",
      error: error.message,
    });
  }
}

  


}

module.exports = ChatController;