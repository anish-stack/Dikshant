"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Users, X, Send, AlertCircle } from "lucide-react";
import axios from "axios";
import { useSocket } from "./context/socket";

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
  const [isFetching, setIsFetching] = useState(false);

  const messagesEndRef = useRef(null);
  const { socket } = useSocket();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Moderation logic ────────────────────────────────────────
  const isMessageBlocked = (message) => {
    const text = message.toLowerCase().trim();

    const phonePatterns = [
      /\d{10}/,
      /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/,
      /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
      /\b\d{5}[-.\s]?\d{5}\b/,
    ];

    const blockedKeywords = [
      "porn", "sex", "xxx", "adult", "nude", "onlyfans", "dating",
      "flipkart", "amazon", "myntra", "ajio", "meesho", "snapdeal",
      "aliexpress", "ebay", "shopify", "bet", "casino", "gambling",
      "lottery", "click here", "buy now", "limited offer", "earn money",
      "work from home", "whatsapp", "telegram", "instagram", "dm me",
    ];

    const urlPattern = /(https?:\/\/|www\.)/i;

    if (phonePatterns.some((p) => p.test(text))) {
      return "Phone numbers are not allowed";
    }
    if (blockedKeywords.some((kw) => text.includes(kw))) {
      return "Inappropriate or promotional content not allowed";
    }
    if (urlPattern.test(text)) {
      return "Links are not allowed in chat";
    }

    return null;
  };

  const addMessage = (msg) => {
    if (msg.messageType !== "message") return;

    const normalized = {
      id: msg.id || msg._id || `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId: msg.userId?.toString(),
      userName: msg.userName || user?.name || "Unknown",
      message: msg.message || "",
      timestamp: msg.timestamp || msg.createdAt || new Date(),
      type: msg.messageType || "message",
    };

    setMessages((prev) => {
      const exists = prev.some(
        (m) =>
          m.id === normalized.id ||
          (m.message === normalized.message &&
            m.userId === normalized.userId &&
            Math.abs(new Date(m.timestamp) - new Date(normalized.timestamp)) < 2500)
      );
      if (exists) return prev;
      return [...prev, normalized];
    });
  };

  const fetchChatHistory = async () => {
    if (isFetching || !videoId) return;
    setIsFetching(true);

    try {
      const res = await axios.get(
        `https://www.app.api.dikshantias.com/api/chat/history/${videoId}?limit=500`
      );

      if (res.data?.success && Array.isArray(res.data.data)) {
        res.data.data
          .filter((msg) => msg.messageType === "message")
          .forEach((msg) => {
            if (!messages.some((m) => m.id === (msg.id || msg._id))) {
              addMessage(msg);
            }
          });
        setTimeout(scrollToBottom, 120);
      }
    } catch (err) {
      console.error("Chat history fetch failed:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!visible || !videoId || !userId || !socket) return;

    fetchChatHistory();
    socket.emit("join-chat", { videoId, userId });

    const handleNewMessage = (data) => {
      if (data.messageType === "message") {
        addMessage(data);
        scrollToBottom();
      }
    };

    const handleTyping = ({ userId: senderId }) => {
      if (senderId !== userId) {
        setIsTyping(true);
        const timer = setTimeout(() => setIsTyping(false), 2800);
        return () => clearTimeout(timer);
      }
    };

    const handleLiveCount = ({ total }) => {
      const count = Number(total) || 0;
      setLiveCount(count);
      onLiveCountChange?.(count);
    };

    const handleAdminMsg = (data) => {
      if (data.messageType === "message") {
        addMessage({
          ...data,
          userName: data.userName || "Admin",
        });
      }
    };

    socket.on("chat-message", handleNewMessage);
    socket.on("user-typing", handleTyping);
    socket.on("live-watching-count", handleLiveCount);
    socket.on("admin-message", handleAdminMsg);

    const poll = setInterval(fetchChatHistory, 4000);

    return () => {
      clearInterval(poll);
      socket.off("chat-message", handleNewMessage);
      socket.off("user-typing", handleTyping);
      socket.off("live-watching-count", handleLiveCount);
      socket.off("admin-message", handleAdminMsg);
      socket.emit("leave-chat", { videoId, userId });
    };
  }, [socket, visible, videoId, userId, user?.name]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !socket) return;

    const blockReason = isMessageBlocked(trimmed);
    if (blockReason) {
      setBlockWarning(blockReason);
      setTimeout(() => setBlockWarning(""), 4200);
      return;
    }

    const payload = {
      videoId,
      userId: userId.toString(),
      userName: user?.name || "Student",
      message: trimmed,
      messageType: "message",
      timestamp: new Date().toISOString(),
    };

    socket.emit("send-chat-message", payload);
    addMessage({ ...payload, id: `temp-${Date.now()}` });
    setNewMessage("");
  };

  const handleTyping = () => {
    if (socket && newMessage.trim()) {
      socket.emit("typing", { videoId, userId });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!visible) return null;

  // ─── Inline Mode (YouTube-like fixed layout) ────────────────
  if (inline) {
    return (
      <div className="flex flex-col h-full w-full bg-white">
        {/* ═══ FIXED HEADER ═══ */}
        {/* ═══ SCROLLABLE MESSAGES ═══ */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {messages.map((msg) => {
            const isOwn = msg.userId === userId.toString();
            return (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0 shadow-sm">
                  {msg.userName?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`font-semibold text-sm ${isOwn ? "text-blue-600" : "text-slate-700"}`}>
                      {msg.userName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 break-words leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2.5 text-sm text-slate-400 italic pl-11">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>Someone is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ═══ WARNING BANNER ═══ */}
        {blockWarning && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{blockWarning}</span>
          </div>
        )}

        {/* ═══ FIXED INPUT BAR ═══ */}
        <div className="flex-shrink-0 p-3 border-t bg-white">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Modal/Popup Mode ────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="pointer-events-auto w-full md:w-96 bg-white shadow-2xl h-[85vh] md:h-[92vh] lg:h-[95vh] rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none md:mr-4 md:mb-4 animate-slide-up flex flex-col">
        
        {/* ═══ FIXED HEADER ═══ */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-3xl md:rounded-tl-3xl md:rounded-tr-none">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-base">Live Chat</h3>
              <div className="flex items-center gap-1.5 text-xs opacity-90 mt-0.5">
                <Users className="w-3.5 h-3.5" />
                <span>{liveCount} watching</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ═══ SCROLLABLE MESSAGES ═══ */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {messages.map((msg) => {
            const isOwn = msg.userId === userId.toString();
            return (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white uppercase flex-shrink-0 shadow-sm">
                  {msg.userName?.[0] || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={`font-semibold text-sm ${isOwn ? "text-blue-600" : "text-slate-700"}`}>
                      {msg.userName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-800 break-words leading-relaxed">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2.5 text-sm text-slate-400 italic pl-11">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>Someone is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ═══ WARNING BANNER ═══ */}
        {blockWarning && (
          <div className="flex-shrink-0 px-4 py-2.5 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-medium">{blockWarning}</span>
          </div>
        )}

        {/* ═══ FIXED INPUT BAR ═══ */}
        <div className="flex-shrink-0 p-3 border-t bg-white">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
              maxLength={500}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              aria-label="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}