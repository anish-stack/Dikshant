"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, Users, X, Send } from "lucide-react"
import { useSocket } from "./context/socket"

export default function LiveChat({
  user,
  videoId,
  userId,
  visible,
  onClose,
  onLiveCountChange,
  inline = false, // Added inline prop for YouTube-style layout
}) {
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [liveCount, setLiveCount] = useState(0)
  const messagesEndRef = useRef(null)
  const { socket } = useSocket()

  console.log("user,",user)
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const addMessage = (msg) => {
    const normalized = {
      id: msg.id || msg._id || `msg-${Date.now()}-${Math.random()}`,
      userId: msg.userId?.toString(),
      userName: user.name || "Unknown",
      message: msg.message || "",
      timestamp: msg.timestamp || msg.createdAt || new Date(),
      type: msg.messageType || "message",
    }

    setMessages((prev) => {
      // Check for duplicates
      const exists = prev.some(
        (m) =>
          m.message === normalized.message &&
          m.userId === normalized.userId &&
          Math.abs(new Date(m.timestamp) - new Date(normalized.timestamp)) < 2000,
      )
      if (exists) return prev
      return [...prev, normalized]
    })
  }

  const fetchChatHistory = async () => {
    try {
      const res = await fetch(`http://localhost:5001/api/chat/history/${videoId}?limit=500`)
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        const chatMessages = data.data.filter((msg) => msg.messageType === "message")
        chatMessages.forEach(addMessage)
        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error.message)
    }
  }

  useEffect(() => {
    if (!visible || !videoId || !userId || !socket) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([])
    fetchChatHistory()

    socket.emit("join-chat", { videoId, userId })

    const handleNewMessage = (data) => {
      if (data.messageType === "message") {
        addMessage(data)
        setTimeout(scrollToBottom, 100)
      }
    }

    const handleTypingStart = (data) => {
      if (data.userId !== userId) {
        setIsTyping(true)
        setTimeout(() => setIsTyping(false), 3000)
      }
    }

    const handleLiveCount = (data) => {
      const count = data.total || 0
      setLiveCount(count)
      if (onLiveCountChange) onLiveCountChange(count)
    }

    const handleAdminMessage = (data) => {
      console.log("Admin message:", data)
      addMessage({
        ...data,
        userName: "Admin",
        messageType: "message",
      })
    }

    socket.on("chat-message", handleNewMessage)
    socket.on("user-typing", handleTypingStart)
    socket.on("live-watching-count", handleLiveCount)
    socket.on("admin-message", handleAdminMessage)

    return () => {
      socket.off("chat-message", handleNewMessage)
      socket.off("user-typing", handleTypingStart)
      socket.off("live-watching-count", handleLiveCount)
      socket.off("admin-message", handleAdminMessage)
      socket.emit("leave-chat", { videoId, userId })
    }
  }, [socket, visible, videoId, userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = () => {
    const trimmed = newMessage.trim()
    if (!trimmed || !socket) return

    const messageData = {
      videoId,
      userId: userId.toString(),
      userName: user?.name || "Student",
      message: trimmed,
      messageType: "message",
      timestamp: new Date(),
    }

    socket.emit("send-chat-message", messageData)
    addMessage({ ...messageData, id: `temp-${Date.now()}` })
    setNewMessage("")
  }

  const handleTyping = () => {
    if (socket && newMessage.trim()) {
      socket.emit("typing", { videoId, userId })
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!visible) return null

  const containerClasses = inline
    ? "flex flex-col h-full w-full bg-white"
    : "fixed inset-0 z-50 flex items-end md:items-center justify-center md:justify-end"

  const panelClasses = inline
    ? "flex flex-col h-full w-full"
    : "relative bg-white rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none w-full md:w-96 h-[85vh] md:h-full md:max-h-screen flex flex-col shadow-2xl animate-slide-up"

  return (
    <div className={containerClasses}>
      {!inline && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />}

      <div className={panelClasses}>
        {/* Header - Hidden in inline if needed, but keeping for count */}
        <div
          className={`flex items-center justify-between p-3 border-b ${inline ? "bg-slate-50 text-slate-900" : "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-3xl md:rounded-tl-3xl md:rounded-tr-none"}`}
        >
          <div className="flex items-center gap-2">
            {!inline && <MessageCircle className="w-5 h-5" />}
            <div>
              <h3 className="font-bold text-sm">Live Chat</h3>
              <div className="flex items-center gap-1 text-[10px] opacity-70">
                <Users className="w-3 h-3" />
                <span>{liveCount} watching</span>
              </div>
            </div>
          </div>
          {!inline && (
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Messages - YouTube style */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          {messages.map((msg) => {
            const isOwn = msg.userId === userId.toString()
            return (
              <div key={msg.id} className="flex gap-2 text-sm items-start py-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-blue-700 uppercase">
                  {msg.userName?.[0] || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-bold mr-2 ${isOwn ? "text-blue-600" : "text-slate-500"}`}>
                    {msg.userName}:
                  </span>
                  <span className="text-slate-700 break-words">{msg.message}</span>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input - Compact */}
        <div className="p-3 border-t bg-slate-50">
          <div className="flex gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <input
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              onKeyPress={handleKeyPress}
              placeholder="Say something..."
              className="flex-1 px-3 py-1.5 text-sm focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md disabled:opacity-30"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
