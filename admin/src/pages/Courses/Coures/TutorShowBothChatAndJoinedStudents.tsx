"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Search,
  RefreshCw,

} from "lucide-react";

interface JoinedStudent {
  userId: string | number;
  userName: string;
  joinCount: number;
  leaveCount: number;
  latestStatus: "joined" | "left";
}

interface ChatMessage {
  id: string | number;
  message: string;
  userName: string;
  createdAt: string;
  isFromTeacher: boolean;
}

const TutorShowBothChatAndJoinedStudents = () => {
  const { id } = useParams<{ id: string }>();
  const VIDEO_ID = id;

  // ── Shared States ────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Students
  const [students, setStudents] = useState<JoinedStudent[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentSearch, setStudentSearch] = useState("");

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week">("all");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // ── API Endpoints ────────────────────────────────────────
  const STUDENTS_API = `https://www.app.api.dikshantias.com/api/chat/joined-student/${VIDEO_ID}`;
  const CHAT_API = `https://www.app.api.dikshantias.com/api/chat/chat-message/${VIDEO_ID}`;

  // ── Fetch Students ───────────────────────────────────────
  const fetchStudents = useCallback(async () => {
    try {
      const res = await axios.get(STUDENTS_API);
      if (res.data?.success) {
        setStudents(res.data.users || []);
        setTotalStudents(res.data.totalUsers || 0);
      }
    } catch (err) {
      console.error("Students fetch failed", err);
    }
  }, [VIDEO_ID]);

  // ── Fetch Chat Messages ──────────────────────────────────
  const fetchChat = useCallback(async () => {
    try {
      const res = await axios.get(CHAT_API);
      if (res.data?.success) {
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error("Chat fetch failed", err);
    }
  }, [VIDEO_ID]);

  // ── Polling every 3 seconds ──────────────────────────────
  useEffect(() => {
    if (!VIDEO_ID) return;

    setLoading(true);

    // Initial fetch
    Promise.all([fetchStudents(), fetchChat()]).finally(() =>
      setLoading(false)
    );

    const interval = setInterval(() => {
      fetchStudents();
      fetchChat();
    }, 3000);

    return () => clearInterval(interval);
  }, [VIDEO_ID, fetchStudents, fetchChat]);

  // ── Auto-scroll logic for chat ───────────────────────────
  useEffect(() => {
    if (!chatContainerRef.current) return;

    if (shouldAutoScroll.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // ── Filtered Students ────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const term = studentSearch.toLowerCase();
    return students.filter((s) => s.userName?.toLowerCase().includes(term));
  }, [students, studentSearch]);

  // ── Filtered Chat Messages ───────────────────────────────
  const filteredMessages = useMemo(() => {
    let list = [...messages];

    // Search
    if (chatSearch.trim()) {
      const term = chatSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.message.toLowerCase().includes(term) ||
          m.userName.toLowerCase().includes(term)
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
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messages, chatSearch, timeFilter]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
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

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border">
      {/* Left: Joined Students */}
      <div className="lg:w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">
              Joined Students ({totalStudents})
            </h3>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm border rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-gray-500 text-sm">
              No students found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.userId}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                >
                  <div>
                    <p className="font-medium">{student.userName}</p>
                    <p className="text-xs text-gray-500">
                      Join: {student.joinCount} • Leave: {student.leaveCount}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      student.latestStatus === "joined"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {student.latestStatus.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Live Chat */}
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
                  onClick={() => setTimeFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition ${
                    timeFilter === f
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300"
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
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className={`flex ${isTeacher ? "justify-end" : "justify-start"}`}
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
                        <span className="text-xs font-bold">TEACHER</span>
                        <span>👨‍🏫</span>
                      </div>
                    )}

                    <p>{msg.message}</p>

                    <p className="text-xs mt-2 opacity-70 text-right">
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorShowBothChatAndJoinedStudents;