import { useEffect, useState, useMemo, useCallback, JSX } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

interface Comment {
  id: number;
  text: string;
  userName: string;
  createdAt: string;
  likes?: number;
  replies?: Comment[];
}

const ViewComments = () => {
  const { id } = useParams<{ id: string }>();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<"all" | "today" | "week" | "month">("all");

  const API_URL = `https://www.dikapi.olyox.in/api/comments/admin-comment/${id}`;

  /* =========================
     FETCH COMMENTS (SAFE)
  ========================= */
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);

      if (res.data?.success) {
        setComments(res.data.data ?? []);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (id) fetchComments();
  }, [id, fetchComments]);

  /* =========================
     HELPERS
  ========================= */
  const toggleReplies = (commentId: number) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
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

  /* =========================
     DEEP SEARCH
  ========================= */
  const deepSearch = (comment: Comment, search: string): boolean => {
    if (
      comment.text.toLowerCase().includes(search) ||
      comment.userName.toLowerCase().includes(search)
    ) {
      return true;
    }

    return (comment.replies ?? []).some((r) => deepSearch(r, search));
  };

  const filteredComments = useMemo(() => {
    let list = [...comments];

    if (searchText) {
      const search = searchText.toLowerCase();
      list = list.filter((c) => deepSearch(c, search));
    }

    if (filterType !== "all") {
      const now = new Date();
      list = list.filter((c) => {
        const diffDays =
          (now.getTime() - new Date(c.createdAt).getTime()) / 86400000;

        if (filterType === "today") return diffDays < 1;
        if (filterType === "week") return diffDays <= 7;
        if (filterType === "month") return diffDays <= 30;
        return true;
      });
    }

    return list;
  }, [comments, searchText, filterType]);

  /* =========================
     RENDER COMMENT (RECURSIVE)
  ========================= */
  const renderComment = (comment: Comment, depth = 0): JSX.Element => {
    const replies = comment.replies ?? [];
    const hasReplies = replies.length > 0;
    const isExpanded = expandedComments.has(comment.id);

    return (
      <div
        key={comment.id}
        className={`flex gap-4 py-5 ${
          depth > 0 ? "ml-12 border-l-2 border-gray-200 pl-6" : ""
        }`}
      >
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
          {comment.userName.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
            <div className="flex gap-3 items-center">
              <p className="font-semibold">{comment.userName}</p>
              <span className="text-sm text-gray-500">
                {formatTime(comment.createdAt)}
              </span>
            </div>

            {hasReplies && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="text-sm text-indigo-600 font-medium"
              >
                {isExpanded
                  ? "Hide replies"
                  : `${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
              </button>
            )}
          </div>

          <p className="text-gray-800 mb-3">{comment.text}</p>

          <div className="flex gap-4 text-sm text-gray-600">
            <span>👍 {comment.likes ?? 0}</span>
            <button className="hover:text-indigo-600">Reply</button>
          </div>

          {/* Replies */}
          {hasReplies && isExpanded && (
            <div className="mt-4 space-y-4">
              {replies.map((r) => renderComment(r, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* =========================
     UI STATES
  ========================= */
  if (loading) {
    return <div className="p-10 text-center">Loading comments...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto bg-white border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">
          Comments ({filteredComments.length})
        </h2>

        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search comments..."
          className="w-full px-4 py-2 border rounded"
        />

        <div className="flex gap-2 mt-4">
          {(["all", "today", "week", "month"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-4 py-1 rounded ${
                filterType === f
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-6 space-y-6">
        {filteredComments.length === 0 ? (
          <p className="text-center text-gray-500">No comments found</p>
        ) : (
          filteredComments.map((c) => renderComment(c))
        )}
      </div>
    </div>
  );
};

export default ViewComments;
