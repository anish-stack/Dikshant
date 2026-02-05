
"use client"

import { useEffect, useRef, useState } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  RotateCw,
  Users,
  MessageCircle,
  X,
  Send,
  Heart,
  ChevronDown,
  ChevronUp,
  Settings,
  Gauge,
} from "lucide-react"
import VideoWatermark from "./VideoWatermark"

export default function VideoPlayer({
  video,
  playableUrl,
  videoSource,
  isLive,
  user,
  viewerCount,
  onReady,
  token,
  userId,
}) {
  const playerRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [loading, setLoading] = useState(false)

  const [sending, setSending] = useState(false)
  // Speed and quality states
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [availableQualities, setAvailableQualities] = useState([])
  const [currentQuality, setCurrentQuality] = useState("auto")

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  const API_BASE = "https://www.app.api.dikshantias.com/api"

const getVideoId = () => {
  if (!playableUrl) return null;

  let cleanUrl = playableUrl.trim();

  // Step 1: Remove < > brackets if present (your backend adds them)
  if (cleanUrl.startsWith("<") && cleanUrl.endsWith(">")) {
    cleanUrl = cleanUrl.slice(1, -1).trim();
  }

  console.log("Cleaned URL for ID extraction:", cleanUrl); // Debug this!

  try {
    const url = new URL(cleanUrl);

    // Case 1: youtu.be short link
    if (url.hostname === "youtu.be") {
      return url.pathname.slice(1).split("?")[0];
    }

    // Case 2: Standard watch?v=
    if (url.searchParams.has("v")) {
      return url.searchParams.get("v");
    }

    // Case 3: /live/VIDEO_ID (new live stream format)
    const liveMatch = url.pathname.match(/\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) {
      return liveMatch[1];
    }

    // Case 4: /embed/
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    // Case 5: Old /v/
    const vMatch = url.pathname.match(/\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];

  } catch (e) {
    // If URL() fails, fall back to regex
  }

  // Fallback: Raw regex on cleaned string
  const regexMatch = cleanUrl.match(/(?:youtube\.com\/live\/|v=|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
  if (regexMatch) {
    return regexMatch[1];
  }

  console.error("Failed to extract YouTube ID from:", playableUrl);
  return null;
};

  const saveWatchProgress = (videoId, time) => {
    if (!videoId || time < 5) return
    try {
      const key = `video_progress_${videoId}`
      if (typeof window !== 'undefined' && window.storage) {
        window.storage.set(key, JSON.stringify({ time, timestamp: Date.now() }))
      }
    } catch (e) {
      console.log("Progress save skipped")
    }
  }

  const getWatchProgress = (videoId) => {
    if (!videoId) return 0
    try {
      const key = `video_progress_${videoId}`
      if (typeof window !== 'undefined' && window.storage) {
        const saved = window.storage.get(key)
        if (!saved) return 0
        const data = JSON.parse(saved)
        if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
          window.storage.delete(key)
          return 0
        }
        return data.time
      }
    } catch {
      return 0
    }
    return 0
  }

  // 🔐 Initialize player ONLY when playableUrl is available
  useEffect(() => {
    if (!playableUrl || !videoSource) {
      console.log("[v0] Waiting for decrypted URL...")
      return
    }

    // Only YouTube videos use iframe API
    if (videoSource !== "youtube") {
      console.log("[v0] Non-YouTube source, different player needed")
      return
    }

    if (window.YT && window.YT.Player) {
      initPlayer()
      return
    }

    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    tag.async = true
    const firstScriptTag = document.getElementsByTagName("script")[0]
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)

    window.onYouTubeIframeAPIReady = () => {
      initPlayer()
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [playableUrl, videoSource])
  

  useEffect(() => {
    if (!playerReady || videoSource !== "youtube") return

    const timeout = setTimeout(() => {
      if (playerRef.current) {
        const qualities = playerRef.current.getAvailableQualityLevels()
        console.log("Available qualities:", qualities)
        setAvailableQualities(qualities || [])

        const currentQ = playerRef.current.getPlaybackQuality()
        console.log("Current quality:", currentQ)
        setCurrentQuality(currentQ || "auto")
      }
    }, 1000)

    return () => clearTimeout(timeout)
  }, [playerReady, videoSource])

  
  useEffect(() => {
  if (playableUrl && videoSource === "youtube") {
    console.log("Playable URL received:", playableUrl);
    const id = getVideoId();
    console.log("Extracted YouTube Video ID:", id);
    if (!id) {
      console.error("FAILED to extract video ID – player will not load");
    }
  }
}, [playableUrl, videoSource]);

  const initPlayer = () => {
    if (!playableUrl) {
      console.error("[v0] No playable URL available")
      return
    }

    if (playerRef.current && playerRef.current.destroy) {
      try {
        playerRef.current.destroy()
      } catch (e) {
        console.log("[v0] Error destroying player:", e)
      }
      playerRef.current = null
    }

    setPlayerReady(false)
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)

    // 🔐 Extract video ID from DECRYPTED playableUrl
    const videoId = getVideoId()

    if (!videoId) {
      console.error("[v0] Could not extract YouTube video ID from decrypted URL")
      return
    }

    const container = document.getElementById("yt-player")
    if (!container) {
      console.error("[v0] Player container not found")
      return
    }

    console.log("[v0] Initializing YouTube player with video ID:", videoId)

    playerRef.current = new window.YT.Player("yt-player", {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 0,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        enablejsapi: 1,
        iv_load_policy: 3,
        mute: 1, 
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          setPlayerReady(true)
          const dur = event.target.getDuration()
          setDuration(dur)

          // Resume from saved progress
          const savedTime = getWatchProgress(videoId)
          if (savedTime > 0 && savedTime < dur - 10) {
            event.target.seekTo(savedTime, true)
          }

          // Auto play on ready
         setTimeout(() => {
            event.target.playVideo()
            event.target.unMute() // Unmute automatically
            event.target.setVolume(100) // Set volume to max
            setPlaying(true)
            setMuted(false)
          }, 500)   

          if (onReady) onReady(event)
        },
        onStateChange: (event) => {
          setPlaying(event.data === window.YT.PlayerState.PLAYING)
        },
      },
    })
  }


useEffect(() => {
  const handleVisibilityChange = () => {
    if (!playerRef.current) return

    if (document.hidden) {
      console.log("[v0] Tab hidden – pausing video")
      playerRef.current.pauseVideo()
    } else {
      console.log("[v0] Tab visible – resuming video")
      playerRef.current.playVideo()
    }
  }

  document.addEventListener("visibilitychange", handleVisibilityChange)

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }
}, [])


  useEffect(() => {
    if (!playerReady || videoSource !== "youtube") return

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const time = playerRef.current.getCurrentTime()
          const dur = playerRef.current.getDuration()
          setCurrentTime(time)
          if (dur > 0) {
            setProgress((time / dur) * 100)
            setDuration(dur)

            const videoId = getVideoId()
            if (videoId && time > 5) {
              saveWatchProgress(videoId, time)
            }
          }

          // Update current quality
          const quality = playerRef.current.getPlaybackQuality()
          if (quality && quality !== currentQuality) {
            setCurrentQuality(quality)
          }
        } catch (error) {
          console.error("[v0] Error getting player time:", error)
        }
      }
    }, 500)

    return () => clearInterval(interval)
  }, [playerReady, currentQuality, videoSource])

  const togglePlayPause = (e) => {
    e?.stopPropagation()
    if (!playerRef.current) return
    if (playing) {
      playerRef.current.pauseVideo()
      setPlaying(false)
    } else {
      playerRef.current.playVideo()
      setPlaying(true)
    }
  }

  const seek = (seconds) => {
    if (!playerRef.current) return
    const current = playerRef.current.getCurrentTime() || 0
    playerRef.current.seekTo(current + seconds, true)
  }

  const handleProgressChange = (e) => {
    if (!playerRef.current) return
    const value = Number.parseFloat(e.target.value)
    const newTime = (value / 100) * duration
    playerRef.current.seekTo(newTime, true)
  }

  const toggleMute = () => {
    if (!playerRef.current) return
    if (muted) {
      playerRef.current.unMute()
      playerRef.current.setVolume(100)
    } else {
      playerRef.current.mute()
    }
    setMuted(!muted)
  }

  const changeSpeed = (speed) => {
    if (!playerRef.current) return
    playerRef.current.setPlaybackRate(speed)
    setPlaybackSpeed(speed)
    setShowSpeedMenu(false)
  }

  const changeQuality = (quality) => {
    if (!playerRef.current) return

    console.log("Requested quality:", quality)

    playerRef.current.pauseVideo()

    setTimeout(() => {
      playerRef.current.setPlaybackQuality(quality)
      console.log("setPlaybackQuality called:", quality)

      playerRef.current.playVideo()

      setTimeout(() => {
        const applied = playerRef.current.getPlaybackQuality()
        console.log("Applied playback quality:", applied)
        setCurrentQuality(applied)
      }, 300)
    }, 200)
  }

  const getQualityLabel = (quality) => {
    const labels = {
      highres: "4K",
      hd1080: "1080p",
      hd720: "720p",
      large: "480p",
      medium: "360p",
      small: "240p",
      tiny: "144p",
      auto: "Auto",
      default: "Auto",
    }
    return labels[quality] || labels["auto"]
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const fullscreen = () => {
    const container = document.querySelector('.relative.w-full.h-full.bg-black')
    if (container) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
        // Auto-rotate on fullscreen
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {})
        }
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen()
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen()
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen()
      }
    }
  }

  const handleContextMenu = (e) => {
    e.preventDefault()
    return false
  }

  // Load Comments from API
  const loadComments = async () => {
    const videoId = video?.id
    if (!videoId || !token) return

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/comments/video/${videoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const data = await res.json()
      if (data.success) {
        setComments(data.data || [])
      }
    } catch (error) {
      console.error("Load comments error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showComments) {
      loadComments()
    }
  }, [showComments, video?.id])

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
        } else {
          setComments((prev) => [newComm, ...prev])
        }

        setNewComment("")
        setReplyingTo(null)
      } else {
        alert(data.message || "Failed to post comment")
      }
    } catch (error) {
      console.error("Send comment error:", error)
      alert("Failed to post comment. Please try again.")
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
      console.error("Like error:", error)
    }
  }

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }))
  }

  const CommentItem = ({ comment, isReply = false }) => (
    <div className={`${isReply ? "ml-8 border-l-2 border-gray-700 pl-4" : ""} py-3`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {comment.author?.[0] || comment.userId?.[0] || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-white font-semibold text-sm">
              {comment.author || comment.userName || "Anonymous"}
            </span>
            <span className="text-gray-400 text-xs">
              {new Date(comment.timestamp || comment.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-200 text-sm mb-2 break-words">{comment.text}</p>
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => handleToggleLike(comment.id || comment._id, isReply, comment.parentId)}
              className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart className={`w-4 h-4 flex-shrink-0 ${comment.isLikedByUser ? "fill-red-500 text-red-500" : ""}`} />
              <span className="text-xs">{comment.likes || 0}</span>
            </button>
            {!isReply && comment.userId !== userId && (
              <button
                onClick={() => setReplyingTo(comment)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {!isReply && comment.replies?.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => toggleReplies(comment.id || comment._id)}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-11"
          >
            {expandedReplies[comment.id || comment._id] ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
          </button>
          {expandedReplies[comment.id || comment._id] && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id || reply._id}
                  comment={{ ...reply, parentId: comment.id || comment._id }}
                  isReply
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // 🔐 Show loading if no playable URL yet
  if (!playableUrl) {
    return (
      <div className="relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Preparing video...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full h-full bg-black group touch-none"
      onMouseMove={() => {
        setShowControls(true)
        clearTimeout(window.controlTimeout)
        window.controlTimeout = setTimeout(() => setShowControls(false), 3000)
      }}
      onTouchStart={() => {
        setShowControls(true)
        clearTimeout(window.controlTimeout)
        window.controlTimeout = setTimeout(() => setShowControls(false), 3000)
      }}
      onContextMenu={handleContextMenu}
    >
      {/* YouTube Player Container */}
      <div className="relative w-full h-full">
        <div id="yt-player" className="absolute inset-0 w-full h-full" />
<VideoWatermark
  userId={`${user?.name}+${new Date().toLocaleTimeString()}+${user.id}`}
/>
        {/* 🔐 SECURITY OVERLAY - BLOCKS ALL YOUTUBE PLAYER INTERACTIONS */}
        <div 
          className="absolute inset-0 w-full h-full z-40"
          onClick={(e) => {
            e.stopPropagation()
            togglePlayPause(e)
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            return false
          }}
          style={{
            cursor: "pointer",
            pointerEvents: "auto"
          }}
        />
        
      </div>

      {/* Custom Controls */}
      <div
        className={`absolute inset-0 flex flex-col justify-end p-2 sm:p-4 lg:p-8 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-50 space-y-3 sm:space-y-4 pointer-events-auto">
          {/* Progress Bar */}
          <div className="px-1 sm:px-2">
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={progress}
              onChange={handleProgressChange}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-white text-xs mt-1 sm:mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2 flex-shrink-0 flex-wrap">
              <button
                onClick={() => seek(-30)}
                className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors hidden sm:block"
                title="Rewind 30s"
              >
                <SkipBack className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => seek(-10)}
                className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={togglePlayPause}
                className="p-2 sm:p-2 lg:p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause className="w-5 h-5 lg:w-6 lg:h-6" /> : <Play className="w-5 h-5 lg:w-6 lg:h-6" />}
              </button>
              <button
                onClick={() => seek(10)}
                className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={() => seek(30)}
                className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors hidden sm:block"
                title="Forward 30s"
              >
                <SkipForward className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button
                onClick={toggleMute}
                className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors ml-0.5 sm:ml-1 hidden sm:block"
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" /> : <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />}
              </button>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1 lg:gap-2 flex-shrink-0">
              {/* Speed Control */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu)
                    setShowQualityMenu(false)
                  }}
                  className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors flex items-center gap-1"
                  title="Playback speed"
                >
                  <Gauge className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="text-xs hidden sm:inline">{playbackSpeed}x</span>
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-lg rounded-lg border border-gray-700 overflow-hidden z-50">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => changeSpeed(speed)}
                        className={`block w-full text-left px-3 sm:px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                          playbackSpeed === speed ? "text-blue-400 bg-white/5" : "text-white"
                        }`}
                      >
                        {speed === 1 ? "Normal" : `${speed}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={fullscreen}
                className="p-1.5 sm:p-2 lg:p-2 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 🔐 BLOCK YOUTUBE UI ELEMENTS */}
        <div className="absolute top-0 left-0 right-0 h-16 z-45 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-12 z-45 pointer-events-none" />

        {/* Live Badge */}
        {isLive && (
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-600 rounded-full text-white text-xs sm:text-sm font-semibold shadow-lg z-50">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>LIVE</span>
            {viewerCount > 0 && (
              <>
                <span className="text-white/70">•</span>
                <Users className="w-4 h-4" />
                <span>{viewerCount}</span>
              </>
            )}
          </div>
        )}
      </div>
      {showComments && (
        <div
          className="absolute right-0 top-0 bottom-0 w-full lg:w-96 bg-black/95 backdrop-blur-lg border-l border-gray-800"
          style={{ zIndex: 200 }}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Comments ({comments.length})
              </h3>
              <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p>Loading comments...</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <CommentItem key={comment.id || comment._id} comment={comment} />
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              {replyingTo && (
                <div className="mb-2 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Replying to{" "}
                    <span className="text-blue-400">{replyingTo.author || replyingTo.userName || "User"}</span>
                  </span>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !sending && handleSendComment()}
                  placeholder="Add a comment..."
                  disabled={sending || !token}
                  className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!newComment.trim() || sending || !token}
                  className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-full text-white transition-colors"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
        .slider {
          background: linear-gradient(
            to right,
            #3b82f6 0%,
            #3b82f6 ${progress}%,
            #4b5563 ${progress}%,
            #4b5563 100%
          );
        }
      `}</style>
    </div>
  )
}