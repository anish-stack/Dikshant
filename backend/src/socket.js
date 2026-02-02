const { Server } = require("socket.io");
const ChatController = require("./controllers/ChatController");
const { User } = require('./models')
let io;

// userId => socketId
const userSocketMap = new Map();

// videoId => Set(userId)
const roomUsersMap = new Map();

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", socket => {
    const userId = socket.handshake.query.userId;
    const userName = socket.handshake.query.userName || "Student";

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`🟢 User ${userId} connected with socket ${socket.id}`);
    }

    /* =======================
       JOIN CHAT ROOM
    ========================*/
    socket.on("join-chat", async ({ videoId }) => {
      socket.join(videoId);

      // Maintain room users set
      if (!roomUsersMap.has(videoId)) roomUsersMap.set(videoId, new Set());
      roomUsersMap.get(videoId).add(userId);

      // Save join in DB
      const joinResult = await ChatController.saveJoin({ videoId, userId, userName });

      // Broadcast join to room (only if first join)
      if (!joinResult.rejoined) {
        io.to(videoId).emit("user-joined-chat", {
          userId,
          userName
        });
      }

      // Update live watching count
      io.to(videoId).emit("live-watching-count", {
        videoId,
        total: roomUsersMap.get(videoId).size
      });

      console.log(`🚪 User ${userId} joined video ${videoId}`);
    });

    /* =======================
       SEND MESSAGE
    ========================*/
    socket.on("send-chat-message", async (data) => {
      try {
        let finalUserName = data.userName;

        // 🔍 If userName not provided, fetch from User table using userId
        if (!finalUserName && data.userId) {
          const user = await User.findById(data.userId).select("name");

          if (user && user.name) {
            finalUserName = user.name;
          } else {
            finalUserName = "Guest"; // fallback
          }
        }

        const result = await ChatController.saveMessage({
          ...data,
          userName: finalUserName,
        });

        const payload = result.success ? result.data : result.fallback;

        io.to(data.videoId).emit("chat-message", {
          id: payload.id,
          videoId: payload.videoId,
          userId: payload.userId,
          userName: payload.userName,
          message: payload.message,
          timestamp: payload.createdAt,
          type: "message",
        });

      } catch (error) {
        console.error("❌ Chat save error:", error);
      }
    });
    /* =======================
       ADMIN MESSAGE
    ========================*/
    socket.on("admin-message", data => {
      io.to(data.videoId).emit("admin-message", {
        id: Date.now().toString(),
        message: data.message,
        timestamp: new Date()
      });
    });

    /* =======================
       TYPING EVENT
    ========================*/
    socket.on("typing", ({ videoId }) => {
      socket.to(videoId).emit("user-typing", { userId });
    });

    /* =======================
       LEAVE ROOM
    ========================*/
    socket.on("leave-chat", async ({ videoId }) => {
      socket.leave(videoId);

      if (roomUsersMap.has(videoId)) {
        roomUsersMap.get(videoId).delete(userId);
        if (roomUsersMap.get(videoId).size === 0) roomUsersMap.delete(videoId);
      }

      await ChatController.saveLeave({ videoId, userId, userName });

      io.to(videoId).emit("user-left-chat", { userId, userName });

      // Update live watching count
      io.to(videoId).emit("live-watching-count", {
        videoId,
        total: roomUsersMap.has(videoId) ? roomUsersMap.get(videoId).size : 0
      });

      console.log(`🚪 User ${userId} left video ${videoId}`);
    });

    /* =======================
       DISCONNECT
    ========================*/
    socket.on("disconnect", () => {
      console.log(`🔴 Socket disconnected: ${socket.id}`);

      if (userId) userSocketMap.delete(userId);

      // Remove from all rooms
      for (const [videoId, usersSet] of roomUsersMap.entries()) {
        if (usersSet.has(userId)) {
          usersSet.delete(userId);
          socket.to(videoId).emit("user-left-chat", { userId, userName });

          // Update live watching count
          io.to(videoId).emit("live-watching-count", {
            videoId,
            total: usersSet.size
          });

          if (usersSet.size === 0) roomUsersMap.delete(videoId);
        }
      }
    });
  });
}

/* =======================
   HELPER FUNCTIONS
========================*/

// Get socketId by userId
function getSocketIdByUserId(userId) {
  return userSocketMap.get(userId);
}

// Get all online users
function getAllOnlineUsers() {
  return Array.from(userSocketMap.keys());
}

// Get users in a video room
function getUsersInRoom(videoId) {
  return roomUsersMap.has(videoId)
    ? Array.from(roomUsersMap.get(videoId))
    : [];
}

function getIO() {
  if (!io) {
    throw new Error("❌ Socket.io not initialized");
  }
  return io;
}
module.exports = {
  getIO,
  initSocket,
  getSocketIdByUserId,
  getAllOnlineUsers,
  getUsersInRoom
};
