import React, { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const StudentChats = () => {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const VIDEO_ID = id;
  const API_URL = `https://www.dikapi.olyox.in/api/chat/chat-message/${VIDEO_ID}`;

  const chatRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const lastMessageCount = useRef(0);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [timeFilter, setTimeFilter] = useState<"all" | "today" | "week">("all");

  const fetchMessages = async () => {
    try {
      const res = await axios.get(API_URL);
      if (res.data?.success) {
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error("Chat fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (!chatRef.current) return;

    if (
      shouldAutoScroll.current &&
      messages.length > lastMessageCount.current
    ) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }

    lastMessageCount.current = messages.length;
  }, [messages]);

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    shouldAutoScroll.current = nearBottom;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtering
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          msg.message.toLowerCase().includes(lower) ||
          msg.userName.toLowerCase().includes(lower)
      );
    }

    if (timeFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((msg) => {
        const msgDate = new Date(msg.createdAt);
        const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
        return timeFilter === "today" ? diffDays === 0 : diffDays <= 7;
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [messages, searchText, timeFilter]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-3 border-b-3 border-indigo-600"></div>
        <p className="mt-4 text-gray-500">Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Fixed Header with Search & Filters */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-5 py-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          Live Chat
        </h3>

        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search messages..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />

        {/* Time Filters */}
        <div className="flex gap-2 mt-3">
          {(["all", "today", "week"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition ${
                timeFilter === filter
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              {filter === "all" ? "All" : filter === "today" ? "Today" : "This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Messages - Takes remaining height */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-5 space-y-4"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchText || timeFilter !== "all"
                ? "No messages match your search"
                : "No messages yet. Start chatting!"}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg: any) => {
            const isTeacher = msg.isFromTeacher;
            const isOwn = false; // Add logic if needed

            return (
              <div
                key={msg.id}
                className={`flex ${isTeacher || isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-[70%] rounded-xl px-4 py-2.5
                    ${isTeacher
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                      : isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    }
                  `}
                >
                  {/* Name */}
                  {!isTeacher && !isOwn && (
                    <p className="text-xs font-medium opacity-80 mb-0.5">
                      {msg.userName}
                    </p>
                  )}

                  {/* Admin Badge */}
                  {isTeacher && (
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-xs font-bold">ADMIN</span>
                      <span>👑</span>
                    </div>
                  )}

                  {/* Message */}
                  <p className="text-sm leading-relaxed">{msg.message}</p>

                  {/* Time */}
                  <p className={`text-xs mt-1.5 text-right ${isTeacher || isOwn ? "opacity-70" : "text-gray-500 dark:text-gray-400"}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default StudentChats;