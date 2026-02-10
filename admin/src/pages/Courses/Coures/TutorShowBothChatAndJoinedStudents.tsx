"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import axios, { isAxiosError } from "axios";
import { useParams } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Search,
  RefreshCw,
  TrendingUp,
  Clock,
  Activity,
  Send,
  AlertCircle,
} from "lucide-react";

interface JoinedStudent {
  userId: string | number;
  userName: string;
  latestStatus: "joined" | "left";
  lastActionAt: string;
  firstJoinedAt: string;
  messageCount?: number;
}

interface ChatMessage {
  id: string | number;
  message: string;
  userName: string;
  userId: string | number;
  createdAt: string;
  isFromTeacher: boolean;
  messageType: string;
}

interface CompleteChatData {
  success: boolean;
  videoId: string;
  messages: ChatMessage[];
  messageStats: {
    totalMessages: number;
    messagesLast10Min: number;
    messagesLast30Min: number;
  };
  users: {
    all: JoinedStudent[];
    active: JoinedStudent[];
    left: JoinedStudent[];
    topActive: Array<{
      userId: string;
      userName: string;
      messageCount: number;
    }>;
  };
  counts: {
    liveCount: number;
    totalMessages: number;
    totalUsers: number;
    activeUsers: number;
    leftUsers: number;
  };
  metadata: {
    limit: number;
    timestamp: string;
  };
}

const TutorShowBothChatAndJoinedStudents = () => {
  const { id } = useParams<{ id: string }>();
  const VIDEO_ID = id;

  // ── Core States ──────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [completeChatData, setCompleteChatData] =
    useState<CompleteChatData | null>(null);

  // ── UI States ────────────────────────────────────────────
  const [studentSearch, setStudentSearch] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week">("all");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "left">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [messagesPerPage] = useState(50);

  // ── Admin Message States ─────────────────────────────────
  const [adminMessage, setAdminMessage] = useState("");
  const [sendingAdminMsg, setSendingAdminMsg] = useState(false);
  const [adminMsgSuccess, setAdminMsgSuccess] = useState("");
  const [adminMsgError, setAdminMsgError] = useState("");

  // ── Refs ─────────────────────────────────────────────────
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const COMPLETE_DATA_API = `https://www.app.api.dikshantias.com/api/chat/complete-data/${VIDEO_ID}`;
  const ADMIN_MESSAGE_API = `https://www.app.api.dikshantias.com/api/chat/admin-message`;

  // ── Fetch Complete Chat Data ─────────────────────────────
  const fetchCompleteChatData = useCallback(async () => {
    if (!VIDEO_ID) return;

    try {
      const res = await axios.get(COMPLETE_DATA_API, {
        params: {
          limit: 500, // Fetch last 500 messages
        },
        timeout: 3000,
      });

      if (res.data?.success) {
        setCompleteChatData(res.data);
      }
    } catch (err) {
      console.error("Complete chat data fetch failed", err);
    }
  }, [VIDEO_ID]);

  // ── Send Admin Message ───────────────────────────────────
  const sendAdminMessage = async () => {
    if (!adminMessage.trim() || !VIDEO_ID) return;

    setSendingAdminMsg(true);
    setAdminMsgError("");
    setAdminMsgSuccess("");

    try {
      const res = await axios.post(
        ADMIN_MESSAGE_API,
        {
          videoId: VIDEO_ID,
          message: adminMessage.trim(),
        },
        { timeout: 7000 },
      );

      if (res.data?.success) {
        setAdminMsgSuccess("Message sent successfully!");
        setAdminMessage("");
        setTimeout(() => setAdminMsgSuccess(""), 3000);

        // Refresh chat data
        setTimeout(fetchCompleteChatData, 500);
      } else {
        throw new Error("Failed to send message");
      }
    } catch (err) {
      if (isAxiosError(err)) {
        setAdminMsgError(
          err?.response?.data?.message || "Failed to send message",
        );
      }
      setTimeout(() => setAdminMsgError(""), 5000);
    } finally {
      setSendingAdminMsg(false);
    }
  };

  // ── Polling Setup ────────────────────────────────────────
  useEffect(() => {
    if (!VIDEO_ID) return;

    setLoading(true);

    // Initial fetch
    Promise.all([fetchCompleteChatData()]).finally(() => setLoading(false));

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchCompleteChatData();
    }, 7000);

    return () => clearInterval(interval);
  }, [VIDEO_ID, fetchCompleteChatData]);

  // ── Auto-scroll Logic ────────────────────────────────────
  useEffect(() => {
    if (!chatContainerRef.current) return;

    if (shouldAutoScroll.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [completeChatData?.messages]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // ── Get Current Students Based on Tab ───────────────────
  const currentStudents = useMemo(() => {
    if (!completeChatData) return [];

    let list: JoinedStudent[] = [];

    if (activeTab === "all") {
      list = completeChatData.users.all;
    } else if (activeTab === "active") {
      list = completeChatData.users.active;
    } else {
      list = completeChatData.users.left;
    }

    // Search filter
    if (studentSearch.trim()) {
      const term = studentSearch.toLowerCase();
      list = list.filter((s) => s.userName?.toLowerCase().includes(term));
    }

    return list;
  }, [completeChatData, activeTab, studentSearch]);

  // ── Filtered Messages with Pagination ───────────────────
  const { filteredMessages, totalPages } = useMemo(() => {
    if (!completeChatData) return { filteredMessages: [], totalPages: 0 };

    let list = [...completeChatData.messages];

    // Search filter
    if (chatSearch.trim()) {
      const term = chatSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.message.toLowerCase().includes(term) ||
          m.userName.toLowerCase().includes(term),
      );
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = Date.now();
      list = list.filter((m) => {
        const msgTime = new Date(m.createdAt).getTime();
        const diffMs = now - msgTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return timeFilter === "today" ? diffDays < 1 : diffDays <= 7;
      });
    }

    // Sort newest first
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    // Pagination
    const totalPages = Math.ceil(list.length / messagesPerPage);
    const startIndex = (currentPage - 1) * messagesPerPage;
    const paginatedList = list.slice(startIndex, startIndex + messagesPerPage);

    return { filteredMessages: paginatedList, totalPages };
  }, [completeChatData, chatSearch, timeFilter, currentPage, messagesPerPage]);

  // ── Format Time ──────────────────────────────────────────
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading live data...</span>
        </div>
      </div>
    );
  }

  if (!completeChatData) {
    return (
      <div className="flex h-[500px] items-center justify-center">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 bg-gray-50 dark:bg-gray-900">
      {/* ══════════════════════════════════════════════════════
          ANALYTICS CARDS
      ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Live Count */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-90">LIVE</span>
          </div>
          <div className="text-3xl font-bold">
            {completeChatData.counts.liveCount}
          </div>
          <div className="text-xs opacity-90 mt-1">Watching Now</div>
        </div>

        {/* Total Messages */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <MessageSquare className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-90">MESSAGES</span>
          </div>
          <div className="text-3xl font-bold">
            {completeChatData.counts.totalMessages}
          </div>
          <div className="text-xs opacity-90 mt-1">Total Messages</div>
        </div>

        {/* Active Users */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-90">ACTIVE</span>
          </div>
          <div className="text-3xl font-bold">
            {completeChatData.counts.activeUsers}
          </div>
          <div className="text-xs opacity-90 mt-1">Active Users</div>
        </div>

        {/* Total Users */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-90">TOTAL</span>
          </div>
          <div className="text-3xl font-bold">
            {completeChatData.counts.totalUsers}
          </div>
          <div className="text-xs opacity-90 mt-1">Total Users</div>
        </div>

        {/* Messages Last 10 Min */}
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 opacity-80" />
            <span className="text-xs font-medium opacity-90">RECENT</span>
          </div>
          <div className="text-3xl font-bold">
            {completeChatData.messageStats.messagesLast10Min}
          </div>
          <div className="text-xs opacity-90 mt-1">Last 10 Min</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ADMIN MESSAGE SENDER
      ══════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Send Admin Message
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={adminMessage}
            onChange={(e) => setAdminMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAdminMessage();
              }
            }}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            maxLength={600}
          />
          <button
            onClick={sendAdminMessage}
            disabled={!adminMessage.trim() || sendingAdminMsg}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {sendingAdminMsg ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send
          </button>
        </div>
        {adminMsgSuccess && (
          <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
            ✓ {adminMsgSuccess}
          </div>
        )}
        {adminMsgError && (
          <div className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {adminMsgError}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MAIN CONTENT: STUDENTS + CHAT
      ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* ────────────────────────────────────────────────────
            LEFT: JOINED STUDENTS
        ──────────────────────────────────────────────────── */}
        <div className="lg:w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Students ({currentStudents.length})
                </h3>
              </div>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-3">
              {(["all", "active", "left"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setStudentSearch("");
                  }}
                  className={`px-3 py-1.5 text-xs rounded-lg transition font-medium ${
                    activeTab === tab
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {tab === "all"
                    ? `All (${completeChatData.users.all.length})`
                    : tab === "active"
                      ? `Active (${completeChatData.users.active.length})`
                      : `Left (${completeChatData.users.left.length})`}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {currentStudents.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No students found
              </div>
            ) : (
              <div className="space-y-2">
                {currentStudents.map((student) => (
                  <div
                    key={student.userId}
                    className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 dark:text-gray-200">
                          {student.userName}
                        </p>
                        
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          student.latestStatus === "joined"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {student.latestStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Joined:</span>{" "}
                        {formatDate(student.firstJoinedAt)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">Last Action:</span>{" "}
                      {formatDate(student.lastActionAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────
            RIGHT: LIVE CHAT
        ──────────────────────────────────────────────────── */}
        <div className="lg:flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Live Chat
                </h3>
              </div>
              <div className="flex gap-2">
                {(["all", "today", "week"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setTimeFilter(f);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition ${
                      timeFilter === f
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {f === "all" ? "All" : f === "today" ? "Today" : "Week"}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search messages..."
                value={chatSearch}
                onChange={(e) => {
                  setChatSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>
          </div>

          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto p-5 space-y-4"
          >
            {filteredMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <MessageSquare className="w-10 h-10 mb-3 opacity-40" />
                <p>No messages yet {chatSearch && "matching your search"}</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isTeacher = msg.isFromTeacher;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      isTeacher ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isTeacher
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      }`}
                    >
                      {!isTeacher && (
                        <p className="text-xs font-medium opacity-80 mb-1">
                          {msg.userName}
                        </p>
                      )}

                      {isTeacher && (
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold">ADMIN</span>
                          <span>👨‍🏫</span>
                        </div>
                      )}

                      <p className="break-words">{msg.message}</p>

                      <p className="text-xs mt-2 opacity-70 text-right">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          TOP ACTIVE USERS (Bottom Section)
      ══════════════════════════════════════════════════════ */}
      {completeChatData.users.topActive.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border shadow-sm">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Top Active Users
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {completeChatData.users.topActive.slice(0, 10).map((user, idx) => (
              <div
                key={user.userId}
                className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    #{idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                      {user.userName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.messageCount} messages
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorShowBothChatAndJoinedStudents;
