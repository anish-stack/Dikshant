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

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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
    if (!currentVideo?.secureToken) return;

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

        setPlayableUrl(videoUrl);
        setVideoSource(src);

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
  }, [currentVideo, userId, token]);

  // Fetch batch and videos
  useEffect(() => {
    if (!isOnline || !validateAccess()) {
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

        let selectedVideo = videoList[0];

        if (urlVideoParam) {
          const match = videoList.find((v) => v.secureToken === urlVideoParam.trim());
          if (match) selectedVideo = match;
        }

        setCurrentVideo(selectedVideo);

        // Update URL to reflect current video
        if (urlVideoParam !== selectedVideo.secureToken) {
          const newUrl = new URL(window.location);
          newUrl.searchParams.set("video", selectedVideo.secureToken);
          window.history.replaceState({}, "", newUrl.toString());
        }

        setRetryCount(0);
      } catch (err) {
        console.error("Fetch error:", err);
        // You can enhance error handling here if needed
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOnline, courseId, token]);

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
    window.location.reload();
  };

  // === RENDERING ===

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
        <Sidebar
          videos={videos}
          currentVideo={currentVideo}
          batch={batch}
          onVideoClick={handleVideoClick}
          onClose={() => setSidebarOpen(false)}
        />
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
          {currentVideo && (
            <VideoPlayer
              video={currentVideo}
              playableUrl={playableUrl}
              videoSource={videoSource}
              isLive={isLive}
              viewerCount={viewerCount}
              token={token}
                user={user}
              userId={userId}
            />
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
              <LiveChat
                user={user}
                videoId={currentVideo?.id}
                userId={userId}
                visible={true}
                onLiveCountChange={setLiveCount}
                inline={true}
              />
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