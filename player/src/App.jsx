"use client"

import { useEffect, useState } from "react"
import { Menu, MessageCircle, WifiOff, AlertTriangle, RefreshCw, Shield } from "lucide-react"
import Sidebar from "./sidebar"
import LiveChat from "./LiveChat"
import LiveStatusOverlay from "./LiveStatusOverlay"
import useLiveSession from "./hooks/use-live-session.js"
import { SocketProvider } from "./context/socket"
import VideoPlayer from "./VideoPlayer"
import useAuth from "./hooks/use-auth"
import axios from "axios"
import CommentsSection from "./comments-section"

function LMSContent() {
  const UserParams = new URLSearchParams(window.location.search)
  const userId = UserParams.get("userId")
  const token = UserParams.get("token")
  const courseId = UserParams.get("courseId")
  const [scrolled, setScrolled] = useState(false)
  const { user, loading: userLoading, error: authError, isAuthenticated, refetch } = useAuth(token)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("comments") // Added tab state for live/comments
  const [liveCount, setLiveCount] = useState(0)
  const [duration, setDuration] = useState(0)

  // Data states
  const [batch, setBatch] = useState(null)
  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Video decryption states
  const [playableUrl, setPlayableUrl] = useState(null)
  const [videoSource, setVideoSource] = useState(null)
  const [videoLoading, setVideoLoading] = useState(false)

  // Error & Network states
  const [error, setError] = useState(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      console.log(window.scrollY)
      // Show floating button and hide header after scrolling down > 50px
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // Validate URL parameters
  const validateUrlParams = () => {
    const requiredParams = ["userId", "token"]
    const missingParams = requiredParams.filter((param) => !UserParams.get(param))

    if (missingParams.length > 0) {
      setNotFound(true)
      return false
    }

    const tokenValue = UserParams.get("token")
    if (tokenValue && tokenValue.length < 20) {
      setNotFound(true)
      return false
    }

    return true
  }

  // Check initial URL validity
  useEffect(() => {
    if (!validateUrlParams()) {
      setLoading(false)
    }
  }, [])

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setError(null)
      if (!isAuthenticated && token) {
        refetch()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setError({
        type: "network",
        message: "No internet connection. Please check your network.",
        icon: WifiOff,
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [isAuthenticated, token, refetch])

  // Live session hook
  const { canJoin, isLive, hasEnded, timeToLive, viewerCount, handleJoinLive } = useLiveSession(currentVideo, userId)

  // Security validation
  const validateAccess = () => {
    if (!token || token.length < 20) {
      setError({
        type: "auth",
        message: "Invalid authentication token. Please login again.",
        icon: Shield,
      })
      return false
    }

    if (!userId) {
      setError({
        type: "auth",
        message: "User ID is required. Please login again.",
        icon: Shield,
      })
      return false
    }

    return true
  }

  // Update video token in state (for refresh)
  const updateVideoToken = (videoId, newToken) => {
    setVideos((prevVideos) => prevVideos.map((v) => (v.id === videoId ? { ...v, secureToken: newToken } : v)))

    if (currentVideo?.id === videoId) {
      setCurrentVideo((prev) => ({ ...prev, secureToken: newToken }))
    }
  }

  useEffect(() => {
    if (!currentVideo || !currentVideo.secureToken) return

    const decryptVideo = async () => {
      try {
        setVideoLoading(true)
        setPlayableUrl(null)
        setVideoSource(null)

        const res = await axios.post(
          `https://www.dikapi.olyox.in/api/videocourses/decrypt/batch/${userId}`,
          { token: currentVideo.secureToken },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        const data = res.data

        // 🎥 REAL URL ONLY HERE
        setPlayableUrl(data.videoUrl)
        setVideoSource(data.videoSource)

        // 🔄 TOKEN REFRESH SUPPORT
        if (data.refreshedToken) {
          updateVideoToken(currentVideo.id, data.refreshedToken)
        }
      } catch (err) {
        console.error("Video decryption error:", err)

        // Axios errors have response object
        const status = err.response?.status

        if (status === 401 || status === 403) {
          setError({
            type: "auth",
            message: "You don't have access to this video. Please check your subscription.",
            icon: Shield,
          })
        } else {
          setError({
            type: "auth",
            message: "Video access expired or invalid. Please refresh the page.",
            icon: Shield,
          })
        }
      } finally {
        setVideoLoading(false)
      }
    }

    decryptVideo()
  }, [currentVideo, userId, token]) // Updated dependency array

  // Fetch batch and videos data with error handling
  useEffect(() => {
    if (!isOnline) return

    if (!validateAccess()) {
      setLoading(false)
      return
    }

    refetch()

    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)

        const [batchRes, videosRes] = await Promise.all([
          fetch(`https://www.dikapi.olyox.in/api/batchs/${courseId}`, {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
          fetch(`https://www.dikapi.olyox.in/api/videocourses/batch/${courseId}`, {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }),
        ])

        clearTimeout(timeoutId)

        if (!batchRes.ok || !videosRes.ok) {
          if (batchRes.status === 401 || videosRes.status === 401) {
            throw new Error("UNAUTHORIZED")
          }
          if (batchRes.status === 403 || videosRes.status === 403) {
            throw new Error("FORBIDDEN")
          }
          if (batchRes.status === 404) {
            setNotFound(true)
            setLoading(false)
            return
          }
          throw new Error("SERVER_ERROR")
        }

        const batchData = await batchRes.json()
        const videosData = await videosRes.json()

        if (!batchData || !videosData.success) {
          throw new Error("INVALID_DATA")
        }

        setBatch(batchData)

        if (videosData.data.length > 0) {
          const videoList = videosData.data

          // 🔒 STORE ONLY: id, title, secureToken (NEVER raw URLs)
          setVideos(videoList)

          // Check URL params for specific video
          const params = new URLSearchParams(window.location.search)
          const videoParam = params.get("video")

          if (videoParam && videoList.length) {
            let found = null

            // Try matching by secureToken first (from URL)
            found = videoList.find((v) => v.secureToken === videoParam)

            // Fallback: try matching by videoId (if it's a number)
            if (!found && !isNaN(videoParam)) {
              found = videoList.find((v) => v.id === Number.parseInt(videoParam))
            }

            if (!found) {
              // If no match, use first video
              setCurrentVideo(videoList[0])
            } else {
              setCurrentVideo(found)
            }
          } else if (videoList.length) {
            setCurrentVideo(videoList[0])
          }
        } else {
          setError({
            type: "empty",
            message: "No videos available in this course.",
            icon: AlertTriangle,
          })
        }

        setRetryCount(0)
      } catch (err) {
        console.error("Failed to load course data:", err)

        if (err.name === "AbortError") {
          setError({
            type: "timeout",
            message: "Request timeout. Server is taking too long to respond.",
            icon: AlertTriangle,
          })
        } else if (err.message === "UNAUTHORIZED") {
          setError({
            type: "auth",
            message: "Your session has expired. Please login again.",
            icon: Shield,
          })
        } else if (err.message === "FORBIDDEN") {
          setError({
            type: "auth",
            message: "You do not have permission to access this course.",
            icon: Shield,
          })
        } else if (err.message === "Failed to fetch" || !isOnline) {
          setError({
            type: "network",
            message: "Network error. Please check your internet connection.",
            icon: WifiOff,
          })
        } else {
          setError({
            type: "server",
            message: "Failed to load course. Please try again later.",
            icon: AlertTriangle,
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOnline, retryCount])

  const handleVideoClick = (video) => {
    setCurrentVideo(video)
    setSidebarOpen(false)

    // Update URL with secureToken (matches backend URL format)
    const url = new URL(window.location.href)
    url.searchParams.set("video", video.secureToken)
    url.searchParams.set("batchId", courseId) // Keep batchId in sync
    window.history.replaceState({}, "", url)
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  // Loading State
  if (loading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Loading course...</p>
        </div>
      </div>
    )
  }

  // 404 Not Found State
  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-2xl">
          <div className="mb-8">
            <h1 className="text-[150px] lg:text-[200px] font-black text-foreground mb-4 leading-none">404</h1>
            <div className="w-32 h-1 bg-primary mx-auto mb-8"></div>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Page Not Found</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or you don't have access to it.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => (window.location.href = "/")}
              className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full sm:w-auto px-8 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors ml-0 sm:ml-3 mt-3 sm:mt-0"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    const Icon = error.icon
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-border">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-card-foreground mb-2">
            {error.type === "network"
              ? "Connection Error"
              : error.type === "auth"
                ? "Access Denied"
                : "Something went wrong"}
          </h2>
          <p className="text-muted-foreground mb-6">{error.message}</p>

          <div className="space-y-3">
            {(error.type === "network" || error.type === "timeout" || error.type === "server") && (
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Retry
              </button>
            )}

            {error.type === "auth" && (
              <button
                onClick={() => (window.location.href = "/login")}
                className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
              >
                Go to Login
              </button>
            )}

            <button
              onClick={() => (window.location.href = "/")}
              className="w-full px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Unauthorized State
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-border">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-card-foreground mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">{authError || "Please login to access this course."}</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      {/* Network Status Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 z-50 flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5" />
          <span className="text-sm font-medium">No internet connection</span>
        </div>
      )}

      {scrolled && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-2xl border border-slate-300 hover:shadow-xl transition-all duration-300"
        >
          <Menu className="w-6 h-6 text-gray-800" />
        </button>
      )}

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white border-r border-slate-200 overflow-y-auto transition-transform duration-300 shadow-xl lg:shadow-none`}
      >
        <Sidebar
          videos={videos}
          currentVideo={currentVideo}
          batch={batch}
          onVideoClick={handleVideoClick}
          onClose={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50 relative">
        {/* Header - LMS Style */}
        {/* Header - Hidden when scrolled down on mobile */}
        {/* Header - Hidden by default on mobile, appears ONLY when scrolling down */}
        <header
          className={`
    bg-white border-b border-slate-200 px-4 py-3 
    fixed top-0 left-0 right-0 z-40 
    transition-transform duration-300 ease-out
    ${scrolled
              ? "translate-y-0 shadow-md"
              : "-translate-y-full"
            }
    lg:translate-y-0 lg:sticky lg:shadow-none
  `}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Menu button - visible when header is shown (on scroll) */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>

              <div className="min-w-0">
                <h1 className="text-lg font-bold truncate">
                  {currentVideo?.title || "Course Video"}
                </h1>
                <p className="text-xs text-slate-500">{batch?.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLive && (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                  LIVE
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Video Player Section */}
        <div className="w-full bg-black aspect-video max-h-[70vh] relative shadow-lg">
          {currentVideo && (
            <>
              {/* {currentVideo.isLive && hasEnded && (
                <LiveStatusOverlay
                  canJoin={canJoin}
                  hasEnded={hasEnded}
                  timeToLive={timeToLive}
                  onJoinLive={handleJoinLive}
                />
              )} */}
              <VideoPlayer
                video={currentVideo}
                playableUrl={playableUrl}
                videoSource={videoSource}
                isLive={isLive}
                durationSet={setDuration}
                viewerCount={viewerCount}
                token={token}
                userId={userId}
              />
            </>
          )}
        </div>

        {/* Interaction Section - Tabs for Comments/Live Chat */}
        <div className="flex-1 flex flex-col min-h-0 bg-white border-t border-slate-200">
          <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10 px-4">
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === "comments"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
            >
              Comments
            </button>
            {(isLive || (currentVideo?.isLive && !hasEnded)) && (
              <button
                onClick={() => setActiveTab("live")}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "live"
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
              >
                Live Chat
                <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              </button>
            )}
          </div>

          <div className="flex-1 relative">
            {activeTab === "live" ? (
              <div className="h-[500px] md:h-auto">
                <LiveChat
                  user={user}
                  videoId={currentVideo?.id}
                  userId={userId}
                  visible={true}
                  onLiveCountChange={setLiveCount}
                  inline={true} // Added prop to handle inline display
                />
              </div>
            ) : (
              <div className="p-4 mx-auto w-full">
                <CommentsSection
                  video={currentVideo}
                  userId={userId}
                  token={token}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  const UserParams = new URLSearchParams(window.location.search)
  const userId = UserParams.get("userId")
  return (
    <SocketProvider userId={userId}>
      <LMSContent />
    </SocketProvider>
  )
}
