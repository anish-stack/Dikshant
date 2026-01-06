"use client"

import { useEffect, useState, useRef } from "react"
import { Heart, ChevronDown, ChevronUp, MessageCircle, Send, RefreshCw, Check, X } from "lucide-react"

export default function CommentsSection({ video, token, userId }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [toast, setToast] = useState(null)
  const [newCommentIds, setNewCommentIds] = useState(new Set())
  
  const intervalRef = useRef(null)
  const previousCommentsRef = useRef([])

  const API_BASE = "http://localhost:5001/api"

  // Toast notification
  const showToast = (message, type = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Load Comments from API
  const loadComments = async (isAutoRefresh = false) => {
    const videoId = video?.id
    if (!videoId || !token) return

    if (!isAutoRefresh) {
      setLoading(true)
    }
    
    try {
      const res = await fetch(`${API_BASE}/comments/video/${videoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const data = await res.json()
      
      if (data.success) {
        const newComments = data.data || []
        
        // Check for new comments during auto-refresh
        if (isAutoRefresh && previousCommentsRef.current.length > 0) {
          const previousIds = new Set(previousCommentsRef.current.map(c => c.id || c._id))
          const newIds = newComments
            .filter(c => !previousIds.has(c.id || c._id))
            .map(c => c.id || c._id)
          
          if (newIds.length > 0) {
            setNewCommentIds(new Set(newIds))
            setTimeout(() => setNewCommentIds(new Set()), 3000)
          }
        }
        
        previousCommentsRef.current = newComments
        setComments(newComments)
      }
    } catch (error) {
      console.error("[v0] Load comments error:", error)
      if (!isAutoRefresh) {
        showToast("Failed to load comments", "error")
      }
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  // Manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true)
    loadComments(false)
  }

  // Auto-refresh every 4 seconds
  useEffect(() => {
    if (video?.id && token) {
      loadComments()
      
      intervalRef.current = setInterval(() => {
        loadComments(true)
      }, 4000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [video?.id, token])

  const handleSendComment = async () => {
    if (!newComment.trim() || sending || !token) return

    const videoId = video?.id
    if (!videoId) return

    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId,
          text: newComment.trim(),
          parentId: replyingTo?.id || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        const newComm = data.data

        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) => (c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), newComm] } : c)),
          )
          setExpandedReplies((prev) => ({ ...prev, [replyingTo.id]: true }))
          showToast("Reply posted successfully!", "success")
        } else {
          setComments((prev) => [newComm, ...prev])
          showToast("Comment posted successfully!", "success")
        }

        setNewComment("")
        setReplyingTo(null)
      } else {
        showToast(data.message || "Failed to post comment", "error")
      }
    } catch (error) {
      console.error("[v0] Send comment error:", error)
      showToast("Failed to post comment. Please try again.", "error")
    } finally {
      setSending(false)
    }
  }

  const handleToggleLike = async (commentId, isReply = false, parentId = null) => {
    if (!token) return

    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}/toggle-like`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await res.json()

      if (data.success) {
        const { likes, action } = data.data

        if (isReply && parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? {
                    ...c,
                    replies: c.replies.map((r) =>
                      r.id === commentId ? { ...r, likes, isLikedByUser: action === "liked" } : r,
                    ),
                  }
                : c,
            ),
          )
        } else {
          setComments((prev) =>
            prev.map((c) => (c.id === commentId ? { ...c, likes, isLikedByUser: action === "liked" } : c)),
          )
        }
      }
    } catch (error) {
      console.error("[v0] Like error:", error)
    }
  }

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const CommentItem = ({ comment, isReply = false }) => {
    const commentId = comment.id || comment._id
    const isNew = newCommentIds.has(commentId)
    
    return (
      <div 
        className={`${isReply ? "ml-4 sm:ml-8 border-l-2 border-gray-300 pl-3 sm:pl-4" : ""} py-3 transition-all duration-300 ${
          isNew ? "bg-blue-50 border border-blue-200 rounded-lg px-2" : ""
        }`}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0 shadow-md">
            {comment.author?.[0] || comment.userName?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-gray-900 font-semibold text-xs sm:text-sm">
                {comment.author || comment.userName || "Anonymous"}
              </span>
              <span className="text-gray-500 text-xs">
                {new Date(comment.timestamp || comment.createdAt).toLocaleDateString()}
              </span>
              {isNew && (
                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">New</span>
              )}
            </div>
            <p className="text-gray-700 text-xs sm:text-sm mb-2 break-words leading-relaxed">{comment.text}</p>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => handleToggleLike(commentId, isReply, comment.parentId)}
                className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors group"
              >
                <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${
                  comment.isLikedByUser 
                    ? "fill-red-500 text-red-500 scale-110" 
                    : "group-hover:scale-110"
                }`} />
                <span className="text-xs">{comment.likes || 0}</span>
              </button>
              {!isReply && comment.userId !== userId && (
                <button
                  onClick={() => setReplyingTo(comment)}
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Reply
                </button>
              )}
            </div>
          </div>
        </div>

        {!isReply && comment.replies?.length > 0 && (
          <div className="mt-2 ml-8 sm:ml-11">
            <button
              onClick={() => toggleReplies(commentId)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors font-medium"
            >
              {expandedReplies[commentId] ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
            {expandedReplies[commentId] && (
              <div className="mt-2 space-y-1">
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id || reply._id}
                    comment={{ ...reply, parentId: commentId }}
                    isReply
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 bg-gradient-to-b from-gray-50 to-white">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin animation-delay-150" 
               style={{ animationDirection: "reverse" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${
          toast.type === "success" 
            ? "bg-green-500 text-white" 
            : "bg-red-500 text-white"
        }`}>
          {toast.type === "success" ? (
            <Check className="w-5 h-5" />
          ) : (
            <X className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header with Refresh */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-500" />
          <h3 className="text-gray-900 font-semibold text-sm sm:text-base">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Comment Input */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50/50">
        {replyingTo && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
            <span className="text-xs text-gray-700">
              Replying to <strong className="text-blue-600">{replyingTo.author || replyingTo.userName}</strong>
            </span>
            <button 
              onClick={() => setReplyingTo(null)} 
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendComment()
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 text-sm transition-all"
            disabled={sending}
          />
          <button
            onClick={handleSendComment}
            disabled={!newComment.trim() || sending}
            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm">Send</span>
          </button>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
        {comments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <CommentItem key={comment.id || comment._id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  )
}