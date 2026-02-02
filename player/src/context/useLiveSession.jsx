import { useEffect, useState } from "react";
import { useSocket } from "./socket";

export default function useLiveSession(video, userId) {
  const [canJoin, setCanJoin] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [timeToLive, setTimeToLive] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const { socket, isConnected } = useSocket();

  // Check if live session has ended (2-hour duration)
  useEffect(() => {
    if (!video || !video.isLive) {
      setHasEnded(false);
      return;
    }

    // If explicitly marked as ended
    if (video.isLiveEnded === true) {
      setHasEnded(true);
      setCanJoin(false);
      setIsLive(false);
      setTimeToLive("✅ Live session ended");
      return;
    }

    // Check if session ended based on time
    if (video.DateOfLive && video.TimeOfLIve) {
      const checkIfEnded = () => {
        const start = new Date(`${video.DateOfLive} ${video.TimeOfLIve}`);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours
        const now = new Date();
        
        if (now > end) {
          setHasEnded(true);
          setCanJoin(false);
          setIsLive(false);
          setTimeToLive("✅ Live session ended");
        }
      };

      checkIfEnded();
      const interval = setInterval(checkIfEnded, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [video]);

  // Check live status and timing
  const checkLiveStatus = () => {
    if (!video || !video.isLive) {
      setCanJoin(false);
      setIsLive(false);
      return;
    }

    if (!video.DateOfLive || !video.TimeOfLIve) {
      setCanJoin(false);
      return;
    }

    const liveDateTime = new Date(`${video.DateOfLive} ${video.TimeOfLIve}`);
    const now = new Date();
    const timeDiff = liveDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));
    const sessionDurationMinutes = 120; // 2 hours
    const minutesSinceStart = -minutesDiff;

    // Session has ended (more than 2 hours since start)
    if (minutesSinceStart > sessionDurationMinutes) {
      setHasEnded(true);
      setCanJoin(false);
      setIsLive(false);
      setTimeToLive("✅ Live session ended");
      return;
    }

    // Can join: 5 minutes before start until end of session
    if (minutesDiff <= 5 && minutesSinceStart <= sessionDurationMinutes) {
      setCanJoin(true);
      
      if (minutesDiff <= 0) {
        // Live is ongoing
        setIsLive(true);
        setTimeToLive("🔴 LIVE NOW");
      } else {
        // Joining window is open but not started yet
        setIsLive(false);
        setTimeToLive(`⏰ Starts in ${minutesDiff} minute${minutesDiff > 1 ? 's' : ''}`);
      }
    } else if (minutesDiff > 5) {
      // Too early to join
      setCanJoin(false);
      setIsLive(false);
      
      // Format the time
      const hours = liveDateTime.getHours();
      const minutes = liveDateTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      
      if (minutesDiff > 1440) {
        // More than a day away
        const days = Math.floor(minutesDiff / 1440);
        setTimeToLive(`⏱️ Starts in ${days} day${days > 1 ? 's' : ''}`);
      } else if (minutesDiff > 60) {
        // More than an hour away
        const hours = Math.floor(minutesDiff / 60);
        setTimeToLive(`⏱️ Starts in ${hours} hour${hours > 1 ? 's' : ''}`);
      } else {
        setTimeToLive(`⏱️ Starts at ${displayHours}:${displayMinutes} ${ampm}`);
      }
    }
  };

  // Run live status check
  useEffect(() => {
    if (!video) return;

    // Check if already ended
    if (video.isLiveEnded === true) {
      setHasEnded(true);
      setCanJoin(false);
      setIsLive(false);
      setTimeToLive("✅ Live session ended");
      return;
    }

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [video]);

  // Socket listeners for live updates
  useEffect(() => {
    if (!socket || !video?.isLive) return;

    const handleUserJoined = (data) => {
      setViewerCount(data.viewerCount);
    };

    const handleUserLeft = (data) => {
      setViewerCount(data.viewerCount);
    };

    const handleLiveUpdate = (data) => {
      if (data.videoId === video.id) {
        setIsLive(data.isLive);
        setViewerCount(data.viewerCount);

        // Server says live has ended
        if (data.hasEnded) {
          setHasEnded(true);
          setCanJoin(false);
          setTimeToLive("✅ Live session ended");
        }
      }
    };

    socket.on("user-joined-live", handleUserJoined);
    socket.on("user-left-live", handleUserLeft);
    socket.on("live-session-update", handleLiveUpdate);

    return () => {
      socket.off("user-joined-live", handleUserJoined);
      socket.off("user-left-live", handleUserLeft);
      socket.off("live-session-update", handleLiveUpdate);
    };
  }, [socket, video]);

  // Join live session
  const handleJoinLive = () => {
    if (!canJoin) {
      alert("You can only join 5 minutes before the live session starts.");
      return;
    }

    if (socket && isConnected && video) {
      socket.emit("join-live-session", {
        videoId: video.id,
        userId: userId,
        userName: "Student"
      });
    }
  };

  return {
    canJoin,
    isLive,
    hasEnded,
    timeToLive,
    viewerCount,
    handleJoinLive
  };
}