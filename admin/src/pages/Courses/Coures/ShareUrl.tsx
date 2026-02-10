"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  MessageSquare,
  RefreshCw,
  Send,
  AlertCircle,
} from "lucide-react";

interface ChatMessage {
  id: string | number;
  message: string;
  userName: string;
  userId: string | number;
  createdAt: string;
  isFromTeacher: boolean;
}

interface LiveData {
  success: boolean;
  videoId: string;
  messages: ChatMessage[];
  counts: {
    liveCount: number;
    totalMessages: number;
  };
}

export default function ShareLiveClassMonitor() {
  const { id } = useParams<{ id: string }>();
  const videoId = id;

  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminMsg, setAdminMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [msgStatus, setMsgStatus] = useState<"success" | "error" | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  const API_BASE = "https://www.app.api.dikshantias.com/api/chat";
  const DATA_URL = `${API_BASE}/complete-data/${videoId}`;
  const MSG_URL = `${API_BASE}/admin-message`;

  const fetchData = useCallback(async () => {
    if (!videoId) return;
    try {
      const res = await axios.get(DATA_URL, {
        params: { limit: 300 },
        timeout: 4000,
      });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load live data", err);
    }
  }, [videoId]);

  const sendAdminMessage = async () => {
    if (!adminMsg.trim() || !videoId) return;

    setSending(true);
    setMsgStatus(null);

    try {
      const res = await axios.post(MSG_URL, {
        videoId,
        message: adminMsg.trim(),
      });

      if (res.data?.success) {
        setMsgStatus("success");
        setAdminMsg("");
        setTimeout(() => setMsgStatus(null), 4000);
        fetchData();
      }
    } catch (err) {
      setMsgStatus("error");
      setTimeout(() => setMsgStatus(null), 5000);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!videoId) return;
    setLoading(true);
    fetchData().finally(() => setLoading(false));

    const interval = setInterval(fetchData, 3500);
    return () => clearInterval(interval);
  }, [videoId, fetchData]);

  // Auto scroll
  useEffect(() => {
    if (chatRef.current && autoScroll.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [data?.messages]);

  const handleScroll = () => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 150;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading live class...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 bg-gray-50 dark:bg-gray-900">
        No live data available
      </div>
    );
  }

  const { liveCount } = data.counts;
  // Show newest messages at the bottom
  const recentMessages = [...data.messages].reverse();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header / Title */}
      <div className="bg-white dark:bg-gray-800 border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h1 className="font-semibold text-lg">
            Live Chat{" "}
            <span className="text-indigo-600">({liveCount} online)</span>
          </h1>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 pb-28 space-y-4 bg-gray-50 dark:bg-gray-900"
      >
        {recentMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-14 h-14 mb-4 opacity-40" />
            <p className="text-lg">No messages yet</p>
          </div>
        ) : (
          recentMessages.map((msg) => {
            const isAdmin = !!msg.isFromTeacher;
            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                    isAdmin
                      ? "bg-indigo-600 text-white"
                      : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {isAdmin ? (
                    <div className="text-xs font-bold mb-1 opacity-90 tracking-wide">
                      ADMIN
                    </div>
                  ) : (
                    <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                      {msg.userName}
                    </div>
                  )}

                  <p className="break-words leading-relaxed">{msg.message}</p>

                  <div className="text-xs mt-2 opacity-70 text-right">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Admin Message Input - Fixed bottom on mobile */}
      <div className="sticky bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-20">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            placeholder="Type your message to all students..."
            value={adminMsg}
            onChange={(e) => setAdminMsg(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAdminMessage();
              }
            }}
            className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base"
            disabled={sending}
          />
          <button
            onClick={sendAdminMessage}
            disabled={!adminMsg.trim() || sending}
            className="px-5 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center min-w-[70px]"
          >
            {sending ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {msgStatus === "success" && (
          <p className="mt-2 text-center text-green-600 text-sm font-medium">
            ✓ Message sent successfully
          </p>
        )}
        {msgStatus === "error" && (
          <p className="mt-2 text-center text-red-600 text-sm flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Failed to send message
          </p>
        )}
      </div>
    </div>
  );
}