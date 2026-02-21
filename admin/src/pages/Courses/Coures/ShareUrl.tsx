"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { MessageSquare, RefreshCw, Send, AlertCircle } from "lucide-react";
import { useParams } from "react-router";

interface ChatMessage {
  id: string | number;
  message: string;
  userName: string;
  userId: string | number;
  createdAt: string;
  isFromTeacher: boolean;
}

interface User {
  _id?: string;
  userId?: string | number;
  name?: string;
  userName?: string;
  // agar aur fields hain jaise role, isTeacher etc to add kar dena
  [key: string]: any;
}

interface LiveData {
  success: boolean;
  videoId: string;
  messages: ChatMessage[];
  users: {
    all: User[];
    active: User[];
    left: User[];
    topActive: User[];
  };
  counts: {
    liveCount: number;
    totalMessages: number;
    totalUsers?: number;
    activeUsers?: number;
    leftUsers?: number;
  };
  // aur jo bhi fields aate hain jaise messageStats, metadata etc.
}

export default function ShareLiveClassMonitor() {
  const { id } = useParams();
  const videoId = id as string;

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
        timeout: 5000,
      });
      if (res.data?.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load live data:", err);
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
        setTimeout(() => setMsgStatus(null), 3000);
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

    const interval = setInterval(fetchData, 4000); // thoda smooth 4s
    return () => clearInterval(interval);
  }, [videoId, fetchData]);

  useEffect(() => {
    if (chatRef.current && autoScroll.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [data?.messages]);

  const handleScroll = () => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    autoScroll.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading live class data...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-500 bg-gray-50">
        No live data available for this class
      </div>
    );
  }

  const { liveCount } = data.counts;
  const onlineUsers = data.users?.active || []; // ← real online users yahan se
  const recentMessages = [...(data.messages || [])].reverse();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Header - ONLINE - XX */}
      <div className="bg-white border-b border-gray-300 px-5 py-4 flex items-center justify-between shadow-sm">
        <div className="text-2xl font-extrabold tracking-wide text-gray-900">
          ONLINE - {liveCount}
        </div>
        <MessageSquare className="w-7 h-7 text-indigo-700" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Real online users */}
        <div className="w-72 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto hidden md:block">
          <div className="p-5 space-y-6">
            {onlineUsers.length === 0 ? (
              <div className="text-gray-500 text-sm italic">
                No active users right now...
              </div>
            ) : (
              onlineUsers.map((user, i) => {
                const displayName = user.name || user.userName || "User";
                return (
                  <div
                    key={user._id || user.userId || i}
                    className="flex items-start gap-3 group"
                  >
                    <div className="mt-1.5">
                      <div className="w-5 h-5 rounded-full border-2 border-gray-500 flex items-center justify-center text-gray-600 text-xs font-bold">
                        ○
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-[15px] group-hover:text-indigo-700 transition-colors">
                        {displayName}
                      </div>
                      <div className="mt-0.5 text-gray-300 text-sm leading-none tracking-wider">
                        - - - - - - - - - - - - - - - - -
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          <div
            ref={chatRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50"
          >
            {recentMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No messages yet</p>
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
                      className={`max-w-[80%] md:max-w-[65%] rounded-xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                        isAdmin
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-gray-200 text-gray-800"
                      }`}
                    >
                      {!isAdmin && (
                        <div className="flex items-start gap-2 mb-2">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-700 text-sm font-semibold shadow-sm">
                            {msg.userName?.charAt(0).toUpperCase()}
                          </div>

                          {/* Name + Status */}
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-gray-900">
                                {msg.userName}
                              </span>

                              {/* Optional online dot */}
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            </div>

                            <span className="text-xs text-gray-500">
                              Member
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="break-words ">{msg.message}</p>

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

          {/* Bottom input */}
          <div className="border-t border-gray-200 bg-white p-4 shadow-inner">
            <div className="flex gap-3 max-w-5xl mx-auto">
              <input
                type="text"
                placeholder="Type message to broadcast to all students..."
                value={adminMsg}
                onChange={(e) => setAdminMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendAdminMessage();
                  }
                }}
                className="flex-1 px-5 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-400 text-base placeholder-gray-400"
                disabled={sending}
              />
              <button
                onClick={sendAdminMessage}
                disabled={!adminMsg.trim() || sending}
                className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center min-w-[80px]"
              >
                {sending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>

            {msgStatus && (
              <div className="mt-3 text-center text-sm font-medium">
                {msgStatus === "success" && (
                  <span className="text-green-600">✓ Sent successfully</span>
                )}
                {msgStatus === "error" && (
                  <span className="text-red-600 flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Failed to send
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
