"use client";
import { useEffect, useState } from "react";
import { Menu, WifiOff, AlertTriangle, RefreshCw, Shield } from "lucide-react";
import Sidebar from "./Sidebar";
import LiveChat from "./LiveChat";
import LiveStatusOverlay from "./LiveStatusOverlay";
import useLiveSession from "./hooks/use-live-session.js";
import { SocketProvider } from "./context/socket";
import VideoPlayer from "./VideoPlayer";
import useAuth from "./hooks/use-auth";
import axios from "axios";
import CommentsSection from "./comments-section";

// === DevTools Detection Imports ===
import devtools from "devtools-detect";
import { addListener, launch } from "devtools-detector";

function LMSContent() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("userId");
  const token = urlParams.get("token");
  const courseId = urlParams.get("courseId");
  const urlVideoParam = urlParams.get("video");

  const [scrolled, setScrolled] = useState(false);
  const {
    user,
    loading: userLoading,
    error: authError,
    isAuthenticated,
    refetch,
  } = useAuth(token);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("comments");
  const [liveCount, setLiveCount] = useState(0);

  // Data states
  const [batch, setBatch] = useState(null);
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Video decryption states
  const [playableUrl, setPlayableUrl] = useState(null);
  const [videoSource, setVideoSource] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // Error & Network states
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);

  // === NEW: DevTools Detection State ===
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // === DevTools Detection + Anti-Piracy Safeguards ===
  useEffect(() => {
    if (!isAuthenticated || loading || userLoading) return;

    // Initial check
    if (devtools.isOpen) {
      setDevToolsOpen(true);
    }

    // devtools-detect listener
    const handleChange = (event) => {
      setDevToolsOpen(event.detail.isOpen);
    };
    window.addEventListener("devtoolschange", handleChange);

    // devtools-detector (more aggressive detection)
    addListener((isOpen) => {
      setDevToolsOpen(isOpen);
    });
    launch(); // Start detector

    // Fallback periodic check
    const interval = setInterval(() => {
      if (devtools.isOpen) {
        setDevToolsOpen(true);
      }
    }, 800);

    // Block right-click
    const blockContext = (e) => e.preventDefault();
    document.addEventListener("contextmenu", blockContext);

    // Block common DevTools shortcuts
    const blockShortcuts = (e) => {
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U
      ) {
        e.preventDefault();
        setDevToolsOpen(true);
      }
    };
    window.addEventListener("keydown", blockShortcuts);

    return () => {
      window.removeEventListener("devtoolschange", handleChange);
      window.removeEventListener("contextmenu", blockContext);
      window.removeEventListener("keydown", blockShortcuts);
      clearInterval(interval);
    };
  }, [isAuthenticated, loading, userLoading]);

  // === When DevTools detected → Block everything ===
  useEffect(() => {
    if (devToolsOpen) {
      setPlayableUrl(null);
      setVideoSource(null);
      setError({
        type: "devtools",
        message:
          "Developer Tools detected! Access blocked to prevent unauthorized recording or inspection. Close DevTools and refresh the page.",
        icon: AlertTriangle,
      });
    }
  }, [devToolsOpen]);

  // URL params validation
  const validateUrlParams = () => {
    const required = ["userId", "token"];
    const missing = required.filter((p) => !urlParams.get(p));
    if (missing.length > 0 || (token && token.length < 20)) {
      setNotFound(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!validateUrlParams()) {
      setLoading(false);
    }
  }, []);

  // Network monitoring
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setError(null);
      if (!isAuthenticated && token) refetch();
    };
    const goOffline = () => {
      setIsOnline(false);
      setError({
        type: "network",
        message: "No internet connection. Please check your network.",
        icon: WifiOff,
      });
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [isAuthenticated, token, refetch]);

  // Live session hook
  const { canJoin, isLive, hasEnded, timeToLive, viewerCount, handleJoinLive } =
    useLiveSession(currentVideo, userId);

  // Access validation
  const validateAccess = () => {
    if (!token || token.length < 20 || !userId) {
      setError({
        type: "auth",
        message: "Invalid credentials. Please login again.",
        icon: Shield,
      });
      return false;
    }
    return true;
  };

  // Token refresh helper
  const updateVideoToken = (videoId, newToken) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, secureToken: newToken } : v))
    );
    if (currentVideo?.id === videoId) {
      setCurrentVideo((prev) => ({ ...prev, secureToken: newToken }));
    }
  };

  // Video decryption
  useEffect(() => {
    if (!currentVideo?.secureToken || devToolsOpen) return;

    const decryptVideo = async () => {
      try {
        setVideoLoading(true);
        setPlayableUrl(null);
        setVideoSource(null);

        const res = await axios.post(
          `https://www.dikapi.olyox.in/api/videocourses/decrypt/batch/${userId}`,
          { token: currentVideo.secureToken },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const { videoUrl, videoSource: src, refreshedToken } = res.data;

        if (!devToolsOpen) {
          setPlayableUrl(videoUrl);
          setVideoSource(src);
        }

        if (refreshedToken) {
          updateVideoToken(currentVideo.id, refreshedToken);
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setError({
            type: "auth",
            message: "Access denied or expired. Please check your subscription.",
            icon: Shield,
          });
        } else {
          setError({
            type: "auth",
            message: "Video access invalid. Please refresh.",
            icon: Shield,
          });
        }
      } finally {
        setVideoLoading(false);
      }
    };

    decryptVideo();
  }, [currentVideo, userId, token, devToolsOpen]);

  // Fetch data effect
  useEffect(() => {
    if (!isOnline || !validateAccess() || devToolsOpen) {
      setLoading(false);
      return;
    }

    refetch();

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const [batchRes, videosRes] = await Promise.all([
          fetch(`https://www.dikapi.olyox.in/api/batchs/${courseId}`, {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`https://www.dikapi.olyox.in/api/videocourses/batch/${courseId}`, {
            signal: controller.signal,
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        clearTimeout(timeout);

        if (!batchRes.ok || !videosRes.ok) {
          const status = batchRes.status || videosRes.status;
          if (status === 401) throw new Error("UNAUTHORIZED");
          if (status === 403) throw new Error("FORBIDDEN");
          if (status === 404) {
            setNotFound(true);
            return;
          }
          throw new Error("SERVER_ERROR");
        }

        const batchData = await batchRes.json();
        const videosData = await videosRes.json();

        if (!batchData || !videosData.success || !videosData.data?.length) {
          throw new Error("INVALID_DATA");
        }

        setBatch(batchData);
        const videoList = videosData.data;
        setVideos(videoList);

        const currentUrlParams = new URLSearchParams(window.location.search);
        const urlVideoToken = currentUrlParams.get("video")?.trim();

        let selectedVideo = videoList[0];

        if (urlVideoToken) {
          const match = videoList.find((v) => v.secureToken === urlVideoToken);
          if (match) {
            selectedVideo = match;
          }
        }

        setCurrentVideo(selectedVideo);

        const currentTokenInUrl = currentUrlParams.get("video");
        if (currentTokenInUrl !== selectedVideo.secureToken) {
          const newUrl = new URL(window.location);
          newUrl.searchParams.set("video", selectedVideo.secureToken);
          window.history.replaceState({}, "", newUrl.toString());
        }

        setRetryCount(0);
      } catch (err) {
        console.error("Fetch error:", err);
        // Handle other errors if needed
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, courseId, token, devToolsOpen]);

  const handleVideoClick = (video) => {
    setCurrentVideo(video);
    setSidebarOpen(false);

    const url = new URL(window.location);
    url.searchParams.set("video", video.secureToken);
    url.searchParams.set("batchId", courseId);
    window.history.replaceState({}, "", url);
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    window.location.reload(); // Force refresh on retry if needed
  };

  // === RENDERING LOGIC (same as before, with devtools error added) ===

  if (loading || userLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="text-center max-w-2xl">
          <h1 className="text-[150px] lg:text-[200px] font-black text-foreground mb-4 leading-none">404</h1>
          <div className="w-32 h-1 bg-primary mx-auto mb-8"></div>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Page Not Found</h2>
          <p className="text-muted-foreground text-lg mb-8">The page doesn't exist or access denied.</p>
          <div className="space-y-3">
            <button onClick={() => (window.location.href = "/")} className="px-8 py-3 bg-primary text-white rounded-lg font-medium">
              Go to Home
            </button>
            <button onClick={() => window.history.back()} className="px-8 py-3 bg-secondary rounded-lg font-medium ml-3">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const Icon = error.icon || AlertTriangle;
    const title =
      error.type === "network" ? "Connection Error" :
      error.type === "auth" ? "Access Denied" :
      error.type === "devtools" ? "Security Alert" :
      "Error";

    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground mb-6">{error.message}</p>
          <div className="space-y-3">
            {error.type !== "devtools" && (error.type === "network" || error.type === "timeout" || error.type === "server") && (
              <button onClick={handleRetry} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg">
                <RefreshCw className="w-5 h-5" /> Retry
              </button>
            )}
            {error.type === "auth" && (
              <button onClick={() => (window.location.href = "/login")} className="w-full px-6 py-3 bg-primary text-white rounded-lg">
                Go to Login
              </button>
            )}
            {(error.type === "devtools") && (
              <button onClick={() => window.location.reload()} className="w-full px-6 py-3 bg-primary text-white rounded-lg">
                Refresh Page
              </button>
            )}
            <button onClick={() => (window.location.href = "/")} className="w-full px-6 py-3 bg-secondary rounded-lg">
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="bg-card rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-6">{authError || "Please login to continue."}</p>
          <button onClick={() => (window.location.href = "/login")} className="w-full px-6 py-3 bg-primary text-white rounded-lg">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Main UI
  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 z-50 flex items-center justify-center gap-2">
          <WifiOff className="w-5 h-5" />
          <span className="text-sm font-medium">No internet connection</span>
        </div>
      )}

      {scrolled && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-xl shadow-2xl border"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-80 bg-white border-r overflow-y-auto transition-transform duration-300`}>
        <Sidebar videos={videos} currentVideo={currentVideo} batch={batch} onVideoClick={handleVideoClick} onClose={() => setSidebarOpen(false)} />
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
        <header className={`bg-white border-b px-4 py-3 fixed top-0 left-0 right-0 z-40 transition-transform ${scrolled ? "translate-y-0 shadow-md" : "-translate-y-full"} lg:translate-y-0 lg:sticky`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-lg font-bold truncate">{currentVideo?.title || "Loading..."}</h1>
                <p className="text-xs text-slate-500">{batch?.name}</p>
              </div>
            </div>
            {isLive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                LIVE
              </div>
            )}
          </div>
        </header>

        <div className="w-full bg-black aspect-video max-h-[70vh] relative">
          {currentVideo && !devToolsOpen && (
            <VideoPlayer
              video={currentVideo}
              playableUrl={playableUrl}
              videoSource={videoSource}
              isLive={isLive}
              viewerCount={viewerCount}
              token={token}
              userId={userId}
            />
          )}

          {/* Optional: Extra black overlay if DevTools open */}
          {devToolsOpen && (
            <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
              <div className="text-white text-center p-8">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4" />
                <p className="text-xl font-bold">Access Blocked</p>
                <p className="text-sm mt-2">Close Developer Tools and refresh.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col bg-white border-t">
          <div className="flex border-b sticky top-0 bg-white z-10 px-4">
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-6 py-3 text-sm font-semibold border-b-2 ${activeTab === "comments" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}
            >
              Comments
            </button>
            {(isLive || (currentVideo?.isLive && !hasEnded)) && (
              <button
                onClick={() => setActiveTab("live")}
                className={`px-6 py-3 text-sm font-semibold border-b-2 flex items-center gap-2 ${activeTab === "live" ? "border-red-600 text-red-600" : "border-transparent text-slate-500"}`}
              >
                Live Chat
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              </button>
            )}
          </div>

          <div className="flex-1">
            {activeTab === "live" ? (
              <LiveChat user={user} videoId={currentVideo?.id} userId={userId} visible={true} onLiveCountChange={setLiveCount} inline={true} />
            ) : (
              <div className="p-4">
                <CommentsSection video={currentVideo} userId={userId} token={token} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("userId");

  return (
    <SocketProvider userId={userId}>
      <LMSContent />
    </SocketProvider>
  );
}