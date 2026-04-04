"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Play, Pause, SkipBack, SkipForward,
  Volume2, VolumeX, Maximize, Minimize,
  RotateCcw, RotateCw, MessageCircle, X,
  Send, Heart, ChevronDown, ChevronUp, Gauge,
} from "lucide-react"
import VideoWatermark from "./VideoWatermark"

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
const API_BASE = "https://www.app.api.dikshantias.com/api"
const PROGRESS_STALE = 7 * 24 * 60 * 60 * 1000  // 7 days
const CONTROLS_HIDE = 3000
const DOUBLE_TAP_MS = 300

const QUALITY_LABELS = {
  highres: "4K", hd1080: "1080p", hd720: "720p",
  large: "480p", medium: "360p", small: "240p",
  tiny: "144p", auto: "Auto", default: "Auto",
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
function extractYouTubeId(rawUrl) {
  if (!rawUrl) return null
  let url = rawUrl.trim()
  if (url.startsWith("<") && url.endsWith(">")) url = url.slice(1, -1).trim()
  try {
    const p = new URL(url)
    if (p.hostname === "youtu.be") return p.pathname.slice(1).split("?")[0]
    if (p.searchParams.has("v")) return p.searchParams.get("v")
    const m = p.pathname.match(/\/(?:live|embed|v)\/([a-zA-Z0-9_-]{11})/)
    if (m) return m[1]
  } catch (_) { }
  const m = url.match(/(?:youtube\.com\/live\/|v=|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/)
  return m ? m[1] : null
}

function getQualityLabel(q) { return QUALITY_LABELS[q] ?? "Auto" }

function formatTime(s) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`
}

function isMobileDevice() {
  if (typeof window === "undefined") return false
  return (
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Watch-progress persistence
// ─────────────────────────────────────────────────────────────────────────────
const pKey = (id) => `vp_${id}`

function saveProgress(videoId, time) {
  if (!videoId || time < 5 || typeof window === "undefined") return
  try { localStorage.setItem(pKey(videoId), JSON.stringify({ time, ts: Date.now() })) } catch (_) { }
}

function loadProgress(videoId) {
  if (!videoId || typeof window === "undefined") return 0
  try {
    const raw = localStorage.getItem(pKey(videoId))
    if (!raw) return 0
    const { time, ts } = JSON.parse(raw)
    if (Date.now() - ts > PROGRESS_STALE) { localStorage.removeItem(pKey(videoId)); return 0 }
    return time ?? 0
  } catch (_) { return 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoPlayer({
  video, playableUrl, videoSource, isLive,
  user, viewerCount, onReady, token, userId,
}) {
  // ── Refs ──────────────────────────────────────────────────────────────────
  const playerRef = useRef(null)
  const playerReadyRef = useRef(false)
  const videoIdRef = useRef(null)
  const controlsTimer = useRef(null)
  const lastTapRef = useRef(0)
  const tapTimer = useRef(null)
  const initStartedRef = useRef(false)
  const autoFsRef = useRef(false)   // auto-fullscreen fired once

  // ── Player state ──────────────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // ── Quality / speed ───────────────────────────────────────────────────────
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [availableQualities, setAvailableQualities] = useState([])
  const [currentQuality, setCurrentQuality] = useState("auto")

  // ── Comments ──────────────────────────────────────────────────────────────
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState(null)
  const [expandedReplies, setExpandedReplies] = useState({})
  const [loadingComments, setLoadingComments] = useState(false)
  const [sending, setSending] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────
  // Controls visibility
  // ─────────────────────────────────────────────────────────────────────────
  const revealControls = useCallback(() => {
    setShowControls(true)
    clearTimeout(controlsTimer.current)
    controlsTimer.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Fullscreen helpers
  // ─────────────────────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    console.log("▶️ [VP] Sending fullscreen request to React Native");

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "fullscreenRequest" })
      );
      setIsFullscreen(true)
    } else {
      console.warn("⚠️ Not inside React Native WebView");
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "exitfromFullScreen" })
      );
      setIsFullscreen(false)
    } else {
      console.warn("⚠️ Not inside React Native WebView");
    }
  }, [])
  const toggleFullscreen = useCallback(() => {
    console.log("🎬 [VP] Fullscreen toggle clicked");
    console.log("📊 [VP] Current isFullscreen:", isFullscreen);

    if (isFullscreen) {
      console.log("⬇️ [VP] Exiting fullscreen...");
      exitFullscreen();
    } else {
      console.log("⬆️ [VP] Entering fullscreen...");
      enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);
  // Sync isFullscreen state with browser fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      const active = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      )
      setIsFullscreen(active)
      if (!active && screen?.orientation?.unlock) screen.orientation.unlock()
    }
    document.addEventListener("fullscreenchange", onFsChange)
    document.addEventListener("webkitfullscreenchange", onFsChange)
    document.addEventListener("mozfullscreenchange", onFsChange)
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange)
      document.removeEventListener("webkitfullscreenchange", onFsChange)
      document.removeEventListener("mozfullscreenchange", onFsChange)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-fullscreen on mobile (fires once when player is ready)
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {

    if (!playableUrl || autoFsRef.current || !isMobileDevice()) return

    const tryAuto = () => {
      if (autoFsRef.current) return
      autoFsRef.current = true
      setTimeout(enterFullscreen, 800)  // small delay for smooth UX
    }

    if (playerReady) {
      tryAuto()
    } else {
      // Poll until ready (max 12 s)
      const poll = setInterval(() => {
        if (playerReadyRef.current) { clearInterval(poll); clearTimeout(guard); tryAuto() }
      }, 500)
      const guard = setTimeout(() => clearInterval(poll), 12000)
      return () => { clearInterval(poll); clearTimeout(guard) }
    }
  }, [playableUrl, playerReady, enterFullscreen])

  useEffect(() => {
    enterFullscreen()
  }, [])
  // ─────────────────────────────────────────────────────────────────────────
  // Player initialisation
  // ─────────────────────────────────────────────────────────────────────────
  const initPlayer = useCallback((videoId) => {
    if (!videoId) return
    if (initStartedRef.current && videoIdRef.current === videoId) return
    initStartedRef.current = true
    videoIdRef.current = videoId

    if (playerRef.current?.destroy) {
      try { playerRef.current.destroy() } catch (_) { }
      playerRef.current = null
    }

    playerReadyRef.current = false
    setPlayerReady(false)
    setPlaying(false)
    setProgress(0)
    setCurrentTime(0)
    setDuration(0)

    const container = document.getElementById("yt-player")
    if (!container) { console.error("[VP] #yt-player not found"); return }

    playerRef.current = new window.YT.Player("yt-player", {
      videoId,
      width: "100%",   // ✅ yeh add karo
      height: "100%",  // ✅ yeh add karo
      playerVars: {
        autoplay: 1, controls: 0, disablekb: 0, fs: 0,
        rel: 0, modestbranding: 1, playsinline: 1,
        enablejsapi: 1, iv_load_policy: 3, mute: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          playerReadyRef.current = true
          setPlayerReady(true)

          const dur = event.target.getDuration()
          setDuration(dur)

          const saved = loadProgress(videoId)
          if (saved > 5 && saved < dur - 10) event.target.seekTo(saved, true)

          setTimeout(() => {
            event.target.playVideo()
            event.target.unMute()
            event.target.setVolume(100)
            setPlaying(true)
            setMuted(false)
          }, 500)

          setTimeout(() => {
            const qs = event.target.getAvailableQualityLevels() ?? []
            setAvailableQualities(qs)
            setCurrentQuality(event.target.getPlaybackQuality() ?? "auto")
          }, 1500)

          onReady?.(event)
        },
        onStateChange: (event) => {
          setPlaying(event.data === window.YT.PlayerState.PLAYING)
        },
      },
    })
  }, [onReady])

  // Load YT API → init player
  useEffect(() => {
    if (!playableUrl || videoSource !== "youtube") return
    const videoId = extractYouTubeId(playableUrl)
    if (!videoId) { console.error("[VP] Could not extract video ID"); return }
    if (videoIdRef.current === videoId && playerRef.current) return

    if (window.YT?.Player) {
      initPlayer(videoId)
    } else {
      if (!document.getElementById("yt-api-script")) {
        const tag = document.createElement("script")
        tag.id = "yt-api-script"
        tag.src = "https://www.youtube.com/iframe_api"
        tag.async = true
        document.head.appendChild(tag)
      }
      window.onYouTubeIframeAPIReady = () => initPlayer(videoId)
    }
  }, [playableUrl, videoSource, initPlayer])

  // True unmount cleanup
  useEffect(() => {
    return () => {
      if (playerRef.current?.destroy) {
        saveProgress(videoIdRef.current, playerRef.current.getCurrentTime?.() ?? 0)
        try { playerRef.current.destroy() } catch (_) { }
        playerRef.current = null
      }
      clearTimeout(controlsTimer.current)
      clearTimeout(tapTimer.current)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Visibility change — pause / resume without restarting
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onChange = () => {
      if (!playerRef.current || !playerReadyRef.current) return
      if (document.hidden) {
        const t = playerRef.current.getCurrentTime?.() ?? 0
        saveProgress(videoIdRef.current, t)
        playerRef.current.pauseVideo()
        setPlaying(false)
      } else {
        const saved = loadProgress(videoIdRef.current)
        const current = playerRef.current.getCurrentTime?.() ?? 0
        if (saved > 5 && current < 2) playerRef.current.seekTo(saved, true)
        playerRef.current.playVideo()
        setPlaying(true)
      }
    }
    document.addEventListener("visibilitychange", onChange)
    return () => document.removeEventListener("visibilitychange", onChange)
  }, [])

  // Progress polling + quality sync
  useEffect(() => {
    if (!playerReady || videoSource !== "youtube") return
    const id = setInterval(() => {
      if (!playerRef.current?.getCurrentTime) return
      try {
        const t = playerRef.current.getCurrentTime()
        const d = playerRef.current.getDuration()
        setCurrentTime(t)
        if (d > 0) { setProgress((t / d) * 100); setDuration(d) }
        if (t > 5) saveProgress(videoIdRef.current, t)
        const q = playerRef.current.getPlaybackQuality()
        if (q) setCurrentQuality((prev) => q !== prev ? q : prev)
      } catch (_) { }
    }, 500)
    return () => clearInterval(id)
  }, [playerReady, videoSource])

  useEffect(() => {
    const handleOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight

      // Force the parent page to hide header in landscape
      const header = document.querySelector('header, nav, .navbar, [class*="header"], [class*="Header"]')
      const appRoot = document.getElementById('app') || document.querySelector('main')

      if (isLandscape) {
        // Hide any header/nav
        if (header) {
          header.style.display = 'none'
          header.dataset.hiddenByVP = 'true'
        }
        // Make body/root fullscreen
        document.body.style.overflow = 'hidden'
        document.body.style.height = '100dvh'
        enterFullscreen()
      } else {
        // Restore header
        document.querySelectorAll('[data-hidden-by-vp="true"]').forEach(el => {
          el.style.display = ''
          delete el.dataset.hiddenByVP
        })
        document.body.style.overflow = ''
        document.body.style.height = ''
        exitFullscreen()
      }
    }

    handleOrientation() // run on mount
    window.addEventListener('resize', handleOrientation)
    return () => {
      window.removeEventListener('resize', handleOrientation)
      // Cleanup on unmount
      document.querySelectorAll('[data-hidden-by-vp="true"]').forEach(el => {
        el.style.display = ''
      })
      document.body.style.overflow = ''
    }
  }, [enterFullscreen, exitFullscreen])
  // ─────────────────────────────────────────────────────────────────────────
  // Tap handler — single tap reveals controls, double-tap toggles play/pause
  // ─────────────────────────────────────────────────────────────────────────
  const handleOverlayTap = useCallback((e) => {
    e.stopPropagation()
    revealControls()

    const now = Date.now()
    const delta = now - lastTapRef.current
    lastTapRef.current = now

    const screenWidth = window.innerWidth
    const tapX = e.touches ? e.touches[0].clientX : e.clientX

    if (delta < DOUBLE_TAP_MS) {
      if (!playerRef.current) return

      // 🔥 LEFT SIDE → BACKWARD
      if (tapX < screenWidth * 0.4) {
        playerRef.current.seekTo(
          (playerRef.current.getCurrentTime() || 0) - 10,
          true
        )
      }

      // 🔥 RIGHT SIDE → FORWARD
      else if (tapX > screenWidth * 0.6) {
        playerRef.current.seekTo(
          (playerRef.current.getCurrentTime() || 0) + 10,
          true
        )
      }

      // 🔥 CENTER → PLAY / PAUSE (optional)
      else {
        if (playing) {
          playerRef.current.pauseVideo()
          setPlaying(false)
        } else {
          playerRef.current.playVideo()
          setPlaying(true)
        }
      }

      lastTapRef.current = 0 // reset
    }
  }, [playing, revealControls])
  // ─────────────────────────────────────────────────────────────────────────
  // Playback controls
  // ─────────────────────────────────────────────────────────────────────────
  const togglePlayPause = useCallback((e) => {
    e?.stopPropagation()
    if (!playerRef.current) return
    if (playing) { playerRef.current.pauseVideo(); setPlaying(false) }
    else { playerRef.current.playVideo(); setPlaying(true) }
  }, [playing])

  const seek = useCallback((seconds) => {
    if (!playerRef.current) return
    playerRef.current.seekTo((playerRef.current.getCurrentTime() ?? 0) + seconds, true)
  }, [])

  const handleProgressChange = useCallback((e) => {
    if (!playerRef.current) return
    playerRef.current.seekTo((parseFloat(e.target.value) / 100) * duration, true)
  }, [duration])

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return
    if (muted) { playerRef.current.unMute(); playerRef.current.setVolume(100) }
    else { playerRef.current.mute() }
    setMuted((m) => !m)
  }, [muted])

  const changeSpeed = useCallback((speed) => {
    playerRef.current?.setPlaybackRate(speed)
    setPlaybackSpeed(speed)
    setShowSpeedMenu(false)
  }, [])

  const changeQuality = useCallback((quality) => {
    if (!playerRef.current) return
    playerRef.current.pauseVideo()
    setTimeout(() => {
      playerRef.current.setPlaybackQuality(quality)
      playerRef.current.playVideo()
      setTimeout(() => setCurrentQuality(playerRef.current.getPlaybackQuality() ?? quality), 300)
    }, 200)
    setShowQualityMenu(false)
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Comments
  // ─────────────────────────────────────────────────────────────────────────
  const loadComments = useCallback(async () => {
    if (!video?.id || !token) return
    setLoadingComments(true)
    try {
      const res = await fetch(`${API_BASE}/comments/video/${video.id}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (data.success) setComments(data.data ?? [])
    } catch (err) {
      console.error("[VP] loadComments:", err)
    } finally {
      setLoadingComments(false)
    }
  }, [video?.id, token])

  useEffect(() => { if (showComments) loadComments() }, [showComments, loadComments])

  const handleSendComment = useCallback(async () => {
    if (!newComment.trim() || sending || !token || !video?.id) return
    setSending(true)
    try {
      const res = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, text: newComment.trim(), parentId: replyingTo?.id ?? null }),
      })
      const data = await res.json()
      if (data.success) {
        const nc = data.data
        if (replyingTo) {
          setComments((prev) => prev.map((c) =>
            c.id === replyingTo.id ? { ...c, replies: [...(c.replies ?? []), nc] } : c
          ))
          setExpandedReplies((prev) => ({ ...prev, [replyingTo.id]: true }))
        } else {
          setComments((prev) => [nc, ...prev])
        }
        setNewComment("")
        setReplyingTo(null)
      } else {
        alert(data.message ?? "Failed to post comment")
      }
    } catch (err) {
      console.error("[VP] sendComment:", err)
      alert("Network error. Please try again.")
    } finally {
      setSending(false)
    }
  }, [newComment, sending, token, video?.id, replyingTo])

  const handleToggleLike = useCallback(async (commentId, isReply = false, parentId = null) => {
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/comments/${commentId}/toggle-like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      const data = await res.json()
      if (!data.success) return
      const { likes, action } = data.data
      const liked = action === "liked"
      setComments((prev) => prev.map((c) => {
        if (isReply && c.id === parentId)
          return { ...c, replies: c.replies.map((r) => r.id === commentId ? { ...r, likes, isLikedByUser: liked } : r) }
        if (!isReply && c.id === commentId)
          return { ...c, likes, isLikedByUser: liked }
        return c
      }))
    } catch (err) {
      console.error("[VP] toggleLike:", err)
    }
  }, [token])

  const toggleReplies = useCallback((id) => {
    setExpandedReplies((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // CommentItem sub-component
  // ─────────────────────────────────────────────────────────────────────────
  const CommentItem = ({ comment, isReply = false }) => {
    const id = comment.id ?? comment._id
    return (
      <div className={`${isReply ? "ml-8 border-l-2 border-gray-700 pl-4" : ""} py-3`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(comment.author ?? comment.userId ?? "U")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-white font-semibold text-sm">
                {comment.author ?? comment.userName ?? "Anonymous"}
              </span>
              <span className="text-gray-500 text-xs">
                {new Date(comment.timestamp ?? comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-200 text-sm mb-2 break-words leading-relaxed">{comment.text}</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleToggleLike(id, isReply, comment.parentId)}
                className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 transition-colors"
              >
                <Heart className={`w-3.5 h-3.5 flex-shrink-0 ${comment.isLikedByUser ? "fill-red-500 text-red-500" : ""}`} />
                <span className="text-xs">{comment.likes ?? 0}</span>
              </button>
              {!isReply && comment.userId !== userId && (
                <button
                  onClick={() => setReplyingTo(comment)}
                  className="text-xs text-gray-400 hover:text-blue-400 transition-colors"
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
              onClick={() => toggleReplies(id)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-11 transition-colors"
            >
              {expandedReplies[id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
            </button>
            {expandedReplies[id] && (
              <div className="mt-1">
                {comment.replies.map((r) => (
                  <CommentItem
                    key={r.id ?? r._id}
                    comment={{ ...r, parentId: id }}
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

  // ─────────────────────────────────────────────────────────────────────────
  // Loading gate
  // ─────────────────────────────────────────────────────────────────────────
  if (!playableUrl) {
    return (
      <div className="vp-root relative w-full h-full bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-base font-medium tracking-wide">Preparing video…</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="vp-root relative w-full h-full bg-black touch-none select-none"
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── YouTube iframe ─────────────────────────────────────────────────── */}
      <div className="relative w-full h-full">
        <div id="yt-player" className="absolute inset-0 w-full h-full" style={{ aspectRatio: 'unset' }} />
        <VideoWatermark
          userId={`${user?.name}+${new Date().toLocaleTimeString()}+${user?.id}`}
        />

        {/* Security + tap overlay */}
        <div
          className="absolute inset-0 w-full h-full z-40"
          onClick={handleOverlayTap}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
          style={{ cursor: "pointer", pointerEvents: "auto" }}
        />
      </div>

      {/* ── Controls overlay ───────────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"
          }`}
        style={{ height: '100%', maxHeight: '100dvh' }}
      >
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

        <div className="relative z-50 space-y-1.5 sm:space-y-3 p-2 sm:p-5 pointer-events-auto pb-safe">
          {/* ── Progress bar ─────────────────────────────────────────────── */}
          <div className="px-1">
            <div className="relative group/bar">
              <input
                type="range"
                min="0" max="100" step="0.1"
                value={progress}
                onChange={handleProgressChange}
                className="vp-slider w-full h-1 rounded-full appearance-none cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-white/70 text-xs mt-1.5 font-mono tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* ── Buttons row ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-0.5">

            {/* Left cluster */}
            <div className="flex items-center gap-0 sm:gap-0.5">
              {/* −30s hidden on xs */}
              <button onClick={() => seek(-30)} className="hidden sm:flex p-2 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all" title="−30s">
                <SkipBack className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>

              {/* −10s */}
              <button onClick={() => seek(-10)} className="p-1 sm:p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all" title="−10s">
                <RotateCcw className="w-[15px] h-[15px] sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </button>

              {/* Play / Pause */}
              <button onClick={togglePlayPause} className="p-2 sm:p-2.5 bg-white/20 hover:bg-white/30 active:scale-95 rounded-full text-white transition-all mx-0.5" title={playing ? "Pause" : "Play"}>
                {playing
                  ? <Pause className="w-[18px] h-[18px] sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                  : <Play className="w-[18px] h-[18px] sm:w-5 sm:h-5 lg:w-6 lg:h-6" />}
              </button>

              {/* +10s */}
              <button onClick={() => seek(10)} className="p-1 sm:p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all" title="+10s">
                <RotateCw className="w-[15px] h-[15px] sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </button>

              {/* +30s hidden on xs */}
              <button onClick={() => seek(30)} className="hidden sm:flex p-2 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all" title="+30s">
                <SkipForward className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>

              {/* Mute hidden on xs */}
              <button onClick={toggleMute} className="hidden sm:flex p-2 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all ml-1" title={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX className="w-4 h-4 lg:w-5 lg:h-5" /> : <Volume2 className="w-4 h-4 lg:w-5 lg:h-5" />}
              </button>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-0 sm:gap-0.5">

              {/* Speed menu */}
              <div className="relative">
                <button
                  onClick={() => { setShowSpeedMenu((v) => !v); setShowQualityMenu(false) }}
                  className="p-1 sm:p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all flex items-center gap-0.5"
                  title="Playback speed"
                >
                  <Gauge className="w-[15px] h-[15px] sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  <span className="text-[10px] sm:text-xs hidden sm:inline font-medium">{playbackSpeed}×</span>
                </button>
                {/* ... speed menu dropdown unchanged ... */}
              </div>

              {/* Quality menu — unchanged, already hidden on xs */}

              {/* Comments */}
              <button onClick={() => setShowComments((v) => !v)} className="p-1 sm:p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all" title="Comments">
                <MessageCircle className="w-[15px] h-[15px] sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-1 sm:p-1.5 hover:bg-white/15 rounded-lg text-white/80 hover:text-white transition-all" title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                {isFullscreen
                  ? <Minimize className="w-[15px] h-[15px] sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                  : <Maximize className="w-[15px] h-[15px] sm:w-4 sm:h-4 lg:w-5 lg:h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Phantom bars to block YT chrome */}
        <div className="absolute top-0 left-0 right-0 h-14 z-45 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-10 z-45 pointer-events-none" />
      </div>

      {/* ── Comments panel ─────────────────────────────────────────────────── */}
      {showComments && (
        <div
          className="absolute right-0 top-0 bottom-0 w-full lg:w-96 bg-gray-950/96 backdrop-blur-2xl border-l border-white/8 flex flex-col"
          style={{ zIndex: 200 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8">
            <h3 className="text-white font-semibold flex items-center gap-2 text-sm">
              <MessageCircle className="w-4 h-4 text-blue-400" />
              Comments
              <span className="text-white/40 font-normal">({comments.length})</span>
            </h3>
            <button
              onClick={() => setShowComments(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 px-4">
            {loadingComments ? (
              <div className="text-center text-white/40 py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading…</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center text-white/30 py-12">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No comments yet.</p>
                <p className="text-xs mt-1 opacity-60">Be the first to comment!</p>
              </div>
            ) : (
              comments.map((c) => <CommentItem key={c.id ?? c._id} comment={c} />)
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/8">
            {replyingTo && (
              <div className="mb-2 px-3 py-2 bg-white/5 rounded-lg flex items-center justify-between">
                <span className="text-xs text-white/50">
                  Replying to{" "}
                  <span className="text-blue-400 font-medium">
                    {replyingTo.author ?? replyingTo.userName ?? "User"}
                  </span>
                </span>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-white/30 hover:text-white/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !sending && handleSendComment()}
                placeholder={token ? "Add a comment…" : "Login to comment"}
                disabled={sending || !token}
                className="flex-1 bg-white/8 text-white placeholder-white/30 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/60 disabled:opacity-40 transition-all"
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim() || sending || !token}
                className="p-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:cursor-not-allowed rounded-full text-white transition-all active:scale-95 flex-shrink-0"
              >
                {sending
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
#yt-player iframe {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
}
      /* Lock video page to true fullscreen in landscape on mobile */
@media screen and (max-width: 768px) and (orientation: landscape) {
  header,
  nav,
  .navbar,
  [class*="header"],
  [class*="Header"],
  [class*="navbar"],
  [class*="Navbar"] {
    display: none !important;
  }

  body {
    overflow: hidden !important;
  }
#yt-player,
  #yt-player iframe {
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: 100vw !important;
    height: 100dvh !important;
    max-width: 100vw !important;
    max-height: 100dvh !important;
  }
  /* Make the video wrapper fill entire screen */
  .vp-root {
       position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100dvh !important;   /* <-- dvh important hai */
    z-index: 9999 !important;
  }


  .vp-root > div:last-of-type {   /* controls overlay */
    height: 100dvh !important;
    max-height: 100dvh !important;
  }
    ]
   .vp-root .absolute.inset-0.flex.flex-col.justify-end {
    justify-content: flex-end !important;
    padding-bottom: env(safe-area-inset-bottom, 0px) !important;
  }


}
        .vp-slider {
          background: linear-gradient(
            to right,
            #3b82f6 0%,
            #3b82f6 ${progress}%,
            rgba(255,255,255,0.2) ${progress}%,
            rgba(255,255,255,0.2) 100%
          );
          height: 4px;
          cursor: pointer;
        }
        .vp-slider:hover { height: 6px; transition: height 0.15s; }
        .vp-slider::-webkit-slider-thumb {
          appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
        }
        .vp-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
        }
        .hover\\:bg-white\\/8:hover { background-color: rgba(255,255,255,0.08); }
      `}</style>
    </div>
  )
}