"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MessageCircle,
  Users,
  X,
  Send,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import { useSocket } from "./context/socket";

const API_BASE = "https://www.app.api.dikshantias.com/api/chat";
const JOIN_API = `${API_BASE}/Student-join-api`;
const LEAVE_API = `${API_BASE}/Student-Leave-api`;
const SAVE_MESSAGE_API = `${API_BASE}/chat/save-message`;

export default function LiveChat({
  user,
  videoId,
  userId,
  visible,
  onClose,
  onLiveCountChange,
  inline = false,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const [blockWarning, setBlockWarning] = useState("");
  const [pendingMessages, setPendingMessages] = useState(new Map()); // tempId → {payload, failed}

  const messagesEndRef = useRef(null);
  const { socket, connected: isSocketConnected } = useSocket();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  }, []);

  // ─── Reliable Action (Socket + HTTP fallback) ───────────────────────
  const reliableAction = useCallback(
    async (eventName, payload, fallbackUrl) => {
      let success = false;

      // 1. Try socket first (if connected)
      if (isSocketConnected && socket) {
        try {
          socket.emit(eventName, payload);
          success = true; // optimistic
        } catch (err) {
          console.warn(`Socket emit failed for ${eventName}:`, err);
        }
      }

      // 2. Always try HTTP fallback (especially if socket failed or disconnected)
      if (!success || !isSocketConnected) {
        try {
          const res = await axios.post(fallbackUrl, payload, {
            timeout: 7000,
          });

          if (res.data?.success) {
            success = true;
          }
        } catch (err) {
          console.warn(`HTTP fallback failed for ${eventName}:`, err?.message);
        }
      }

      return success;
    },
    [socket, isSocketConnected]
  );

  // ─── Join / Leave ───────────────────────────────────────────────────
  const joinChat = useCallback(async () => {
    if (!videoId || !userId) return;
    const payload = { videoId, userId: String(userId) };
    await reliableAction("join-chat", payload, JOIN_API);
  }, [videoId, userId, reliableAction]);

  const leaveChat = useCallback(async () => {
    if (!videoId || !userId) return;
    const payload = { videoId, userId: String(userId) };
    await reliableAction("leave-chat", payload, LEAVE_API);
  }, [videoId, userId, reliableAction]);

  // ─── Message Blocking & Normalization ───────────────────────────────
  const isMessageBlocked = (text) => {
    const t = text.toLowerCase().trim();
    if (/\d{10}/.test(t) || /https?:\/\/|www\./i.test(t)) {
      return "Links and phone numbers are not allowed";
    }
    const banned = [
      "porn",
      "sex",
      "xxx",
      "bet",
      "casino",
      "earn money",
      "whatsapp",
      "telegram",
      "buy now",
      "click here",
    ];
    if (banned.some((w) => t.includes(w))) {
      return "Inappropriate or promotional content blocked";
    }
    return null;
  };

  const normalizeMessage = (msg, tempId = null, sending = false, failed = false) => ({
    id: tempId || msg.id || msg._id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: String(msg.userId),
    userName: msg.userName || user?.name || "Unknown",
    message: msg.message || "",
    timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
    sending,
    failed,
  });

  const addOrUpdateMessage = useCallback(
    (msg, isFromServer = false, tempId = null) => {
      if (msg.messageType !== "message") return;

      setMessages((prev) => {
        const normalized = normalizeMessage(msg, tempId, !isFromServer, false);

        // Replace temp message if server sent confirmation
        if (tempId && prev.some((m) => m.id === tempId)) {
          return prev.map((m) =>
            m.id === tempId
              ? { ...normalized, sending: false, failed: false }
              : m
          );
        }

        // Avoid duplicates
        if (prev.some((m) => m.id === normalized.id)) return prev;

        return [...prev, normalized];
      });

      if (isFromServer && tempId) {
        setPendingMessages((prev) => {
          const next = new Map(prev);
          next.delete(tempId);
          return next;
        });
      }
    },
    [user?.name]
  );

  // ─── Send Message ───────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    const blockReason = isMessageBlocked(trimmed);
    if (blockReason) {
      setBlockWarning(blockReason);
      setTimeout(() => setBlockWarning(""), 4800);
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const payload = {
      videoId,
      userId: String(userId),
      userName: user?.name || "Student",
      message: trimmed,
      messageType: "message",
      timestamp: new Date().toISOString(),
    };

    // Optimistic UI
    setMessages((prev) => [
      ...prev,
      normalizeMessage(payload, tempId, true, false),
    ]);
    setPendingMessages((prev) => new Map(prev).set(tempId, { payload, failed: false }));
    setNewMessage("");
    scrollToBottom();

    // Try to send
    const success = await reliableAction("send-chat-message", payload, SAVE_MESSAGE_API);

    if (!success) {
      setPendingMessages((prev) => {
        const next = new Map(prev);
        next.set(tempId, { payload, failed: true });
        return next;
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, sending: false, failed: true } : m))
      );
    }
  };

  // ─── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible || !videoId || !userId) return;

    joinChat();

    // Fetch history once on join
    const fetchHistory = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/history/${videoId}?limit=400`);
        if (data?.success && Array.isArray(data.data)) {
          data.data
            .filter((m) => m.messageType === "message")
            .forEach((m) => addOrUpdateMessage(m, true));
          scrollToBottom();
        }
      } catch (err) {
        console.error("History fetch failed", err);
      }
    };
    fetchHistory();

    // Socket listeners
    const onNewMessage = (data) => {
      if (data.messageType === "message") {
        addOrUpdateMessage(data, true);
        scrollToBottom();
      }
    };

    const onTyping = ({ userId: senderId }) => {
      if (String(senderId) !== String(userId)) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const onLiveCount = ({ total }) => {
      const count = Number(total) || 0;
      setLiveCount(count);
      onLiveCountChange?.(count);
    };

    socket?.on("chat-message", onNewMessage);
    socket?.on("user-typing", onTyping);
    socket?.on("live-watching-count", onLiveCount);

    // Light polling as safety net
    const poll = setInterval(fetchHistory, 12000);

    return () => {
      clearInterval(poll);
      socket?.off("chat-message", onNewMessage);
      socket?.off("user-typing", onTyping);
      socket?.off("live-watching-count", onLiveCount);
      leaveChat();
    };
  }, [
    visible,
    videoId,
    userId,
    socket,
    joinChat,
    leaveChat,
    addOrUpdateMessage,
    scrollToBottom,
    onLiveCountChange,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ─── Typing handler ─────────────────────────────────────────────────
  const handleTyping = () => {
    if (isSocketConnected && socket && newMessage.trim()) {
      socket.emit("typing", { videoId, userId: String(userId) });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ────────────────────────────────────────────────────────────────────
  //                             RENDER
  // ────────────────────────────────────────────────────────────────────

  const MessageBubble = ({ msg }) => {
    const isOwn = msg.userId === String(userId);
    const isPending = msg.sending;
    const isFailed = msg.failed;

    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
        <div
          className={`max-w-[82%] px-4 py-2.5 rounded-2xl shadow-sm ${isOwn
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-gray-100 text-gray-900 rounded-bl-none"
            }`}
        >
          {!isOwn && (
            <div className="text-xs font-medium opacity-80 mb-1">
              {msg.userName}
            </div>
          )}
          <p className="text-[15px] leading-relaxed break-words">
            {msg.message}
          </p>
          <div className="flex items-center justify-end gap-2 text-xs opacity-70 mt-1">
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isFailed && (
              <button
                title="Retry"
                className="text-red-300 hover:text-red-100 transition-colors"
                onClick={sendMessage} // simplistic retry – improve later if needed
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const chatContent = (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-gray-500 italic pl-3">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "180ms" }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "360ms" }} />
            </div>
            <span>someone is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {blockWarning && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          <AlertCircle size={18} />
          <span>{blockWarning}</span>
        </div>
      )}

      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-blue-200 transition">
          <input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-gray-500"
            maxLength={600}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-40 transition"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </>
  );

  if (!visible) return null;

  if (inline) {
    return (
      <div className="flex flex-col h-full bg-white rounded-lg shadow-inner">
        {chatContent}
      </div>
    );
  }

  // Floating mode
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden pointer-events-auto"
        onClick={onClose}
      />

      <div className="pointer-events-auto w-full md:w-[380px] bg-white shadow-2xl h-[86vh] md:h-[94vh] rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none md:mr-5 md:mb-5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center gap-3">
            <MessageCircle size={22} />
            <div>
              <h3 className="font-semibold text-lg">Live Chat</h3>
              <div className="flex items-center gap-2 text-xs opacity-90 mt-0.5">
                <Users size={14} />
                <span>{liveCount} watching now</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition"
          >
            <X size={22} />
          </button>
        </div>

        {chatContent}
      </div>
    </div>
  );
}