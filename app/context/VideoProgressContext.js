import React, { createContext, useContext } from "react"
import { API_URL_LOCAL_ENDPOINT } from "../constant/api"

const VideoProgressContext = createContext(null)

export const useVideoProgress = () => {
  const context = useContext(VideoProgressContext)
  if (!context) {
    throw new Error(
      "useVideoProgress must be used within a VideoProgressProvider"
    )
  }
  return context
}

export const VideoProgressProvider = ({ children, userId, courseId }) => {
  const saveProgress = async (videoId, batchId, watched, duration) => {
    if (!userId || !videoId || !batchId) return

    const payload = {
      userId,
      videoId,
      batchId,
      watched: Math.floor(watched),
      duration: Math.floor(duration || 3600),
      percentage: Math.min(
        100,
        Math.round((Math.floor(watched) / (duration || 3600)) * 100)
      ),
      lastPosition: Math.floor(watched),
      lastWatchedAt: new Date().toISOString(),
      completedAt:
        Math.floor(watched) / (duration || 3600) > 0.95
          ? new Date().toISOString()
          : null
    }

    try {
      const response = await fetch(
        `${API_URL_LOCAL_ENDPOINT}/courseprogresss`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      )

      if (response.ok) {
        console.log("✅ Progress saved:", payload.percentage + "%")
      } else {
        console.error("❌ Progress save failed:", await response.text())
      }
    } catch (error) {
      console.error("❌ Progress save error:", error)
    }
  }

  const getProgress = async videoId => {
    if (!userId || !videoId) return 0

    try {
      const response = await fetch(
        `${API_URL_LOCAL_ENDPOINT}/courseprogresss/${userId}/${videoId}`,
        { method: "GET" }
      )

      if (response.ok) {
        const data = await response.json()
        return data[0]?.lastPosition || 0
      }
    } catch (error) {
      console.error("❌ Fetch progress error:", error)
    }
    return 0
  }

  return (
    <VideoProgressContext.Provider value={{ saveProgress, getProgress }}>
      {children}
    </VideoProgressContext.Provider>
  )
}
