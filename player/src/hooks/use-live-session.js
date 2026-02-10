"use client"

import { useEffect, useState } from "react"
import { useSocket } from "../context/socket"

export default function useLiveSession(video, userId) {
  const [canJoin, setCanJoin] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [hasEnded, setHasEnded] = useState(false)
  const [timeToLive, setTimeToLive] = useState("")
  const [viewerCount, setViewerCount] = useState(0)

  const { socket, isConnected } = useSocket()

  // ✅ Only depend on isLiveEnded (no time logic)
  const checkLiveStatus = () => {
    if (!video) {
      setCanJoin(false)
      setIsLive(false)
      setHasEnded(false)
      setTimeToLive("")
      return
    }

    // Not live video
    if (!video.isLive) {
      setCanJoin(false)
      setIsLive(false)
      setHasEnded(false)
      setTimeToLive("")
      return
    }

    // Live ended (from DB)
    if (video.isLiveEnded === true) {
      setHasEnded(true)
      setCanJoin(false)
      setIsLive(false)
      setTimeToLive("✅ Live session ended")
      return
    }

    // Live active
    setHasEnded(false)
    setCanJoin(true) // if live is enabled & not ended
    setIsLive(true)
    setTimeToLive("🔴 LIVE NOW")
  }

  // ✅ Run check every 30 seconds
  useEffect(() => {
    if (!video) return

    checkLiveStatus()

    const interval = setInterval(() => {
      checkLiveStatus()
    }, 30000) // 30 sec

    return () => clearInterval(interval)
  }, [video])

  // Socket listeners for live updates
  useEffect(() => {
    if (!socket || !video?.isLive) return

    const handleUserJoined = (data) => {
      setViewerCount(data.viewerCount)
    }

    const handleUserLeft = (data) => {
      setViewerCount(data.viewerCount)
    }

    const handleLiveUpdate = (data) => {
      if (data.videoId === video.id) {
        setViewerCount(data.viewerCount)

        // If server says ended
        if (data.hasEnded) {
          setHasEnded(true)
          setCanJoin(false)
          setIsLive(false)
          setTimeToLive("✅ Live session ended")
        }
      }
    }

    socket.on("user-joined-live", handleUserJoined)
    socket.on("user-left-live", handleUserLeft)
    socket.on("live-session-update", handleLiveUpdate)

    return () => {
      socket.off("user-joined-live", handleUserJoined)
      socket.off("user-left-live", handleUserLeft)
      socket.off("live-session-update", handleLiveUpdate)
    }
  }, [socket, video])

  // Join live session
  const handleJoinLive = () => {
    if (!canJoin) {
      alert("Live session is not available.")
      return
    }

    if (socket && isConnected && video) {
      socket.emit("join-live-session", {
        videoId: video.id,
        userId: userId,
        userName: "Student",
      })
    }
  }

  return {
    canJoin,
    isLive,
    hasEnded,
    timeToLive,
    viewerCount,
    handleJoinLive,
  }
}
