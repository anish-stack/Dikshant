
import { useEffect, useRef } from 'react';
import axios from 'axios';

export const useProgressTracker = (userId, videoId, batchId, currentTime, videoDuration, isPlaying) => {
  const progressInterval = useRef(null);
  const lastSavedTime = useRef(0);

  useEffect(() => {
    if (!videoId || !isPlaying || !userId) {
      if (progressInterval.current) clearInterval(progressInterval.current);
      return;
    }

    progressInterval.current = setInterval(() => {
      // Only save if 30+ seconds passed
      if (Math.abs(currentTime - lastSavedTime.current) >= 30) {
        saveProgress();
        lastSavedTime.current = currentTime;
      }
    }, 10000);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, userId, videoId, currentTime]);

  const saveProgress = async () => {
    if (!userId || !videoId) return;

    try {
      await axios.post(`${API_URL_LOCAL_ENDPOINT}/courseprogresss`, {
        userId,
        videoId,
        batchId,
        watched: Math.floor(currentTime),
        duration: Math.floor(videoDuration || 3600),
        percentage: Math.min(100, Math.round((currentTime / (videoDuration || 3600)) * 100)),
        lastPosition: Math.floor(currentTime),
        lastWatchedAt: new Date().toISOString(),
        completedAt: currentTime / (videoDuration || 3600) > 0.95 ? new Date().toISOString() : null,
      });
    } catch (error) {
      console.error('Progress save error:', error);
    }
  };

  return { saveProgress };
};
