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

const API_BASE = "https://www.app.api.dikshantias.com/api/chat";
const JOIN_API = `${API_BASE}/Student-join-api`;
const LEAVE_API = `${API_BASE}/Student-Leave-api`;
const SAVE_MESSAGE_API = `${API_BASE}/chat/save-message`;
const HISTORY_API = `${API_BASE}/history`;

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
  const [liveCount, setLiveCount] = useState(0);
  const [blockWarning, setBlockWarning] = useState("");
  const [pendingMessages, setPendingMessages] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);

const [isPageVisible, setIsPageVisible] = useState(document.visibilityState === "visible");

  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const lastMessageIdRef = useRef(null);
  const hasJoinedRef = useRef(false); // ✅ Track join status
  const userNameRef = useRef(user?.name || "Student"); // ✅ Store userName

  // Update userName ref when user changes
  useEffect(() => {
    userNameRef.current = user?.name || "Student";
  }, [user?.name]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);

  }, []);

  // ─── Message Blocking ───────────────────────────────────────────────
  const isMessageBlocked = useCallback((text) => {
    const t = text.toLowerCase().trim();

    if (/\d{10}/.test(t)) {
      return "Phone numbers are not allowed";
    }

    if (/https?:\/\/|www\./i.test(t)) {
      return "Links are not allowed";
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
  }, []);




  // ─── Message Normalization ──────────────────────────────────────────
  const normalizeMessage = useCallback(
    (msg, tempId = null, sending = false, failed = false) => ({
      id:
        msg.id ||
        msg._id ||
        tempId ||
        `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: String(msg.userId),
      userName: msg.userName || userNameRef.current || "Unknown",
      message: msg.message || "",
      timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
      sending,
      failed,
      tempId: tempId || msg.tempId,
    }),
    []
  );

  // ─── Add or Update Message ──────────────────────────────────────────
  const addOrUpdateMessage = useCallback(
    (msg, isFromServer = false, tempId = null) => {
      if (msg.messageType !== "message") return;

      setMessages((prev) => {
        const normalized = normalizeMessage(msg, tempId, !isFromServer, false);

        // Check if server response has tempId (from echo)
        if (isFromServer && msg.tempId) {
          const pendingIndex = prev.findIndex((m) => m.id === msg.tempId);

          if (pendingIndex !== -1) {
            const newMessages = [...prev];

            newMessages[pendingIndex] = {
              ...normalized,
              id: msg.id || msg._id,
              sending: false,
              failed: false,
            };

            setPendingMessages((p) => {
              const next = new Map(p);
              next.delete(msg.tempId);
              return next;
            });

            return newMessages;
          }
        }

        // If message from server, try to match with pending optimistic message
        if (isFromServer) {
          const pendingIndex = prev.findIndex(
            (m) =>
              m.sending &&
              m.userId === normalized.userId &&
              m.message === normalized.message &&
              Math.abs(
                new Date(m.timestamp) - new Date(normalized.timestamp)
              ) < 5000
          );

          if (pendingIndex !== -1) {
            const newMessages = [...prev];
            const oldTempId = prev[pendingIndex].id;

            newMessages[pendingIndex] = {
              ...normalized,
              sending: false,
              failed: false,
            };

            if (oldTempId.startsWith("temp-")) {
              setPendingMessages((p) => {
                const next = new Map(p);
                next.delete(oldTempId);
                return next;
              });
            }

            return newMessages;
          }
        }

        // Replace temp message if exact tempId match
        if (tempId && prev.some((m) => m.id === tempId)) {
          setPendingMessages((p) => {
            const next = new Map(p);
            next.delete(tempId);
            return next;
          });

          return prev.map((m) =>
            m.id === tempId
              ? { ...normalized, sending: false, failed: false }
              : m
          );
        }

        // Check for duplicates
        const isDuplicate = prev.some(
          (m) =>
            m.id === normalized.id ||
            (m.userId === normalized.userId &&
              m.message === normalized.message &&
              Math.abs(
                new Date(m.timestamp) - new Date(normalized.timestamp)
              ) < 2000)
        );

        if (isDuplicate) return prev;

        return [...prev, normalized];
      });

      scrollToBottom();
    },
    [normalizeMessage, scrollToBottom]
  );

  useEffect(() => {
  const handleVisibilityChange = () => {
    const visible = document.visibilityState === "visible";
    setIsPageVisible(visible);

    if (!visible && hasJoinedRef.current && visible) {  // ← tab hide hone pe leave
      // Tab band / minimize / switch → leave kar do
      const leaveChat = async () => {
        try {
          const payload = { videoId, userId: String(userId) };
          await axios.post(LEAVE_API, payload, { timeout: 6000 });
          console.log("Left chat due to tab invisibility");
          hasJoinedRef.current = false; // important – double call avoid karne ke liye
        } catch (err) {
          console.warn("Leave on visibility change failed:", err?.message);
        }
      };
      leaveChat();
    } else if (visible && !hasJoinedRef.current && visible) {
    
      if (visible) { 
        joinChat();  
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [videoId, userId]);

  // ─── Fetch Messages ─────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!videoId) return;

    try {
      const { data } = await axios.get(`${HISTORY_API}/${videoId}?limit=400`, {
        timeout: 7000,
      });

      if (data?.success && Array.isArray(data.data)) {
        const historyMessages = data.data
          .filter((m) => m.messageType === "message")
          .map((m) => normalizeMessage(m, null, false, false));

        setMessages((prev) => {
          if (historyMessages.length > 0) {
            lastMessageIdRef.current =
              historyMessages[historyMessages.length - 1].id;
          }

          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = historyMessages.filter(
            (m) => !existingIds.has(m.id)
          );

          if (newMsgs.length > 0) {
            scrollToBottom();
            return [...prev, ...newMsgs];
          }

          return prev;
        });

        if (data.liveCount !== undefined) {
          const count = Number(data.liveCount) || 0;
          setLiveCount(count);
          onLiveCountChange?.(count);
        }
      }
    } catch (err) {
      console.error("Fetch messages failed:", err);
    }
  }, [videoId, normalizeMessage, scrollToBottom, onLiveCountChange]);

  // ─── Retry Failed Message ───────────────────────────────────────────
  const retryMessage = useCallback(
    async (tempId) => {
      const pending = pendingMessages.get(tempId);
      if (!pending) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, sending: true, failed: false } : m
        )
      );

      try {
        const res = await axios.post(SAVE_MESSAGE_API, pending.payload, {
          timeout: 7000,
        });

        if (res.data?.success) {
          const serverMessage = res.data.data;

          if (serverMessage?.tempId) {
            addOrUpdateMessage(serverMessage, true);
          }

          setTimeout(() => {
            setPendingMessages((prev) => {
              if (prev.has(tempId)) {
                const next = new Map(prev);
                next.delete(tempId);

                setMessages((msgs) =>
                  msgs.map((m) =>
                    m.id === tempId ? { ...m, sending: false } : m
                  )
                );

                return next;
              }
              return prev;
            });
          }, 2000);

          setTimeout(fetchMessages, 5000);
        } else {
          throw new Error("Send failed");
        }
      } catch (err) {
        console.error("Retry message failed:", err);

        setPendingMessages((prev) => {
          const next = new Map(prev);
          next.set(tempId, { ...pending, failed: true });
          return next;
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, sending: false, failed: true } : m
          )
        );
      }
    },
    [pendingMessages, fetchMessages, addOrUpdateMessage]
  );

  // ─── Send Message ───────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;

    const blockReason = isMessageBlocked(trimmed);
    if (blockReason) {
      setBlockWarning(blockReason);
      setTimeout(() => setBlockWarning(""), 4800);
      return;
    }

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const payload = {
      videoId,
      userId: String(userId),
      userName: userNameRef.current,
      message: trimmed,
      messageType: "message",
      timestamp: new Date().toISOString(),
      tempId,
    };

    setMessages((prev) => [
      ...prev,
      normalizeMessage(payload, tempId, true, false),
    ]);

    setPendingMessages((prev) =>
      new Map(prev).set(tempId, { payload, failed: false })
    );

    setNewMessage("");
    scrollToBottom();

    try {
      const res = await axios.post(SAVE_MESSAGE_API, payload, {
        timeout: 7000,
      });

      if (res.data?.success) {
        const serverMessage = res.data.data;

        if (serverMessage?.tempId) {
          addOrUpdateMessage(serverMessage, true);
        }

        setTimeout(() => {
          setPendingMessages((prev) => {
            if (prev.has(tempId)) {
              const next = new Map(prev);
              next.delete(tempId);

              setMessages((msgs) =>
                msgs.map((m) => (m.id === tempId ? { ...m, sending: false } : m))
              );

              return next;
            }
            return prev;
          });
        }, 2000);

        setTimeout(fetchMessages, 5000);
      } else {
        throw new Error("Send failed");
      }
    } catch (err) {
      console.error("Send message failed:", err);

      setPendingMessages((prev) => {
        const next = new Map(prev);
        next.set(tempId, { payload, failed: true });
        return next;
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, sending: false, failed: true } : m
        )
      );
    }
  }, [
    newMessage,
    videoId,
    userId,
    normalizeMessage,
    scrollToBottom,
    fetchMessages,
    addOrUpdateMessage,
    isMessageBlocked,
  ]);

  // ─── Handle Key Down ────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

   const joinChat = async () => {
        try {
          const payload = { videoId, userId: String(userId) };
          const { data } = await axios.post(JOIN_API, payload, {
            timeout: 7000,
          });

          if (data?.liveCount !== undefined) {
            const count = Number(data.liveCount) || 0;
            setLiveCount(count);
            onLiveCountChange?.(count);
          }

          console.log("✅ Joined chat successfully", data);
          hasJoinedRef.current = true;
        } catch (err) {
          console.warn("Join chat failed:", err?.message);
        }
      };
  // ─── Join/Leave Chat Effect (FIXED) ─────────────────────────────────
  useEffect(() => {
    if (!visible || !videoId || !userId) {
      // ✅ If chat becomes invisible, leave
      if (hasJoinedRef.current) {
        const leaveChat = async () => {
          try {
            const payload = { videoId, userId: String(userId) };
            await axios.post(LEAVE_API, payload, { timeout: 7000 });
            console.log("✅ Left chat successfully");
            hasJoinedRef.current = false;
          } catch (err) {
            console.warn("Leave chat failed:", err?.message);
          }
        };
        leaveChat();
      }
      return;
    }

    // ✅ Join chat only once when visible
    if (!hasJoinedRef.current) {
     

      joinChat();
    }

    // Cleanup: Leave chat only when component unmounts
    return () => {
      if (hasJoinedRef.current) {
        const leaveChat = async () => {
          try {
            const payload = { videoId, userId: String(userId) };
            await axios.post(LEAVE_API, payload, { timeout: 7000 });
            console.log("✅ Left chat on unmount");
            hasJoinedRef.current = false;
          } catch (err) {
            console.warn("Leave chat failed:", err?.message);
          }
        };
        leaveChat();
      }
    };
  }, [visible, videoId, userId, onLiveCountChange]);

  // ─── Fetch Messages Effect (FIXED) ──────────────────────────────────
  useEffect(() => {
    if (!visible || !videoId) return;

    // Initial fetch
    setIsLoading(true);
    fetchMessages().finally(() => setIsLoading(false));

    // Start polling
    pollIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [visible, videoId, fetchMessages]);

  // ─── Message Bubble Component ───────────────────────────────────────
  const MessageBubble = ({ msg }) => {
    const isOwn = msg.userId === String(userId);
    const isPending = msg.sending;
    const isFailed = msg.failed;

    return (
      <div className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}>
        <div
          className={`max-w-[82%] px-4 py-2.5 rounded-2xl shadow-sm transition-all ${
            isOwn
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-gray-100 text-gray-900 rounded-bl-none"
          } ${isPending ? "opacity-70" : "opacity-100"}`}
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
            <span>
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isFailed && (
              <button
                title="Retry sending"
                className={`${
                  isOwn
                    ? "text-red-300 hover:text-red-100"
                    : "text-red-500 hover:text-red-700"
                } transition-colors`}
                onClick={() => retryMessage(msg.id)}
              >
                <RefreshCw size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Chat Content ───────────────────────────────────────────────────
  const chatContent = (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <MessageCircle size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
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
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-gray-500"
            maxLength={600}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition"
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

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-end pointer-events-none">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm md:hidden pointer-events-auto"
        onClick={onClose}
      />

      <div className="pointer-events-auto w-full md:w-[380px] bg-white shadow-2xl h-[86vh] md:h-[94vh] rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none md:mr-5 md:mb-5 flex flex-col overflow-hidden">
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