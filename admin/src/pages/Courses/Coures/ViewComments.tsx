import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const ViewComments = () => {
  const { id } = useParams<{ id: string }>();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month">("all");

  const API_URL = `https://www.dikapi.olyox.in/api/comments/admin-comment/${id}`;

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      if (res.data?.success) {
        setComments(res.data.data || []);
        setError(null);
      }
    } catch (err) {
      console.error("Fetch comments error:", err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchComments();
  }, [id]);

  const toggleReplies = (commentId: number) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getDetailedTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Deep search in comment and all nested replies
  const deepSearch = (comment: any, searchLower: string): boolean => {
    if (
      comment.text.toLowerCase().includes(searchLower) ||
      comment.userName.toLowerCase().includes(searchLower)
    ) {
      return true;
    }

    if (comment.replies && comment.replies.length > 0) {
      return comment.replies.some((reply: any) => deepSearch(reply, searchLower));
    }

    return false;
  };

  // Filter with deep search + date filter
  const filterComments = (comments: any[]): any[] => {
    let filtered = [...comments];

    // Search filter (deep)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((comment) => deepSearch(comment, searchLower));
    }

    // Date filter
    if (filterType !== "all") {
      const now = new Date();
      filtered = filtered.filter((comment) => {
        const commentDate = new Date(comment.createdAt);
        const diffMs = now.getTime() - commentDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);

        switch (filterType) {
          case "today":
            return diffDays === 0;
          case "week":
            return diffDays <= 7;
          case "month":
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  const filteredComments = useMemo(
    () => filterComments(comments),
    [comments, searchText, filterType]
  );

  const renderComment = (comment: any, depth = 0) => {
    const hasReplies = comment.replies && comment.replies.length > 0;
    const isExpanded = expandedComments.has(comment.id);

    return (
      <div
        key={comment.id}
        className={`flex gap-4 py-5 ${depth > 0 ? "ml-12 border-l-2 border-gray-200 dark:border-gray-700 pl-6" : ""}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Comment Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <p className="font-semibold text-base text-gray-900 dark:text-gray-100">
                {comment.userName}
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatTime(comment.createdAt)}
              </span>
            </div>

            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition"
              >
                {isExpanded ? (
                  <>
                    <span>Hide replies</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
            {comment.text}
          </p>

          {/* Like & Reply */}
          <div className="flex items-center gap-6">
            <button className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-1.105 0-2.095.695-2.472 1.735A4.5 4.5 0 006 8.5a4.5 4.5 0 00-4.5 4.5v6A4.5 4.5 0 006 23.5a4.5 4.5 0 004.5-4.5V15" />
              </svg>
              <span>{comment.likes || 0}</span>
            </button>

            <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition font-medium">
              Reply
            </button>
          </div>

          {/* Nested Replies */}
          {hasReplies && isExpanded && (
            <div className="mt-5 space-y-5">
              {comment.replies.map((reply: any) => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600"></div>
        <p className="mt-5 text-gray-600 dark:text-gray-400">Loading comments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl  border border-gray-200 dark:border-gray-700 overflow-hidden max-w-5xl mx-auto">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          Comments ({filteredComments.length})
        </h2>

        {/* Search */}
        <div className="mt-5">
          <input
            type="text"
            placeholder="Search in comments & replies..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full px-5 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {(["all", "today", "week", "month"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-5 py-2 text-sm font-semibold rounded-full transition ${
                filterType === filter
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List */}
      <div className="max-h-[800px] overflow-y-auto">
        {filteredComments.length === 0 ? (
          <div className="text-center py-24 px-8">
            <div className="mx-auto w-36 h-36 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-8">
              <svg className="w-20 h-20 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-3">
              No comments found
            </p>
            <p className="text-base text-gray-500 dark:text-gray-400">
              {searchText || filterType !== "all"
                ? "Try different keywords or filters"
                : "Be the first one to comment!"}
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {filteredComments.map((comment) => renderComment(comment))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewComments;