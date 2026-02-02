import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Haptics from 'expo-haptics';
import { colors } from '../constant/color';
import { useVideoProgress } from '../context/VideoProgressContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isTablet = SCREEN_WIDTH >= 768;
const PLAYER_HEIGHT_PORTRAIT = isTablet ? 400 : 240;

export default function VideoPlayer({
  video,
  userId,
  courseId,
  onShowComments,
  onShowDoubts,
  onShowMyDoubts,
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenDimensions, setScreenDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });
  const [showMenu, setShowMenu] = useState(false);

  const playerRef = useRef(null);
  const { saveProgress, getProgress } = useVideoProgress();

  // Listen to screen dimension changes (rotation)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  // Dynamic player dimensions based on actual screen size
  const isLandscape = screenDimensions.width > screenDimensions.height;
  const playerHeight = isLandscape ? screenDimensions.height * 0.7 : PLAYER_HEIGHT_PORTRAIT;
  const playerWidth = screenDimensions.width;

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const videoId = getYouTubeId(video?.url);

  // Manual fullscreen toggle (no orientation locking)
  const toggleFullscreen = async () => {
    try {
      const newFullscreen = !isFullscreen;
      setIsFullscreen(newFullscreen);

      // Try to trigger native fullscreen (works on Android, sometimes on iOS)
      if (playerRef.current?.setFullscreen) {
        playerRef.current.setFullscreen(newFullscreen);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn('Fullscreen toggle failed:', error);
    }
  };

  // Load saved progress
  useEffect(() => {
    if (video && userId) {
      const loadProgress = async () => {
        const savedPosition = await getProgress(video.id);
        if (savedPosition > 30) {
          Alert.alert(
            'Resume Video?',
            `Continue from ${formatTime(savedPosition)}`,
            [
              { text: 'Start from beginning', style: 'cancel' },
              {
                text: 'Resume',
                onPress: () => {
                  setTimeout(() => {
                    playerRef.current?.seekTo(savedPosition, true);
                  }, 1000);
                },
              },
            ]
          );
        }
      };
      loadProgress();
    }
  }, [video?.id, userId]);

  // Auto-save progress every 10 seconds
  useEffect(() => {
    if (!video || !isPlaying || videoDuration === 0) return;

    const interval = setInterval(() => {
      saveProgress(video.id, courseId, currentTime, videoDuration);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentTime, videoDuration, isPlaying, video?.id, courseId]);

  const onStateChange = (state) => {
    setIsPlaying(state === 'playing');
    if (state === 'ended') {
      playerRef.current?.seekTo(0, true);
      setIsPlaying(true);
    }
  };

  if (!video || !videoId) {
    return (
      <View style={styles.fallbackContainer}>
        <Feather name="video-off" size={48} color="#666" />
        <Text style={styles.fallbackText}>Video not available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Player with dynamic size based on actual screen dimensions */}
      <View style={[styles.playerWrapper, { height: playerHeight }]}>
        <YoutubePlayer
          ref={playerRef}
          height={playerHeight}
          width={playerWidth}
          videoId={videoId}
          play={isPlaying}
          volume={100}
          onChangeState={onStateChange}
          onProgress={(data) => {
            setCurrentTime(data.currentTime);
            setVideoDuration(data.duration || videoDuration);
          }}
          initialPlayerParams={{
            controls: true,
            rel: false,
            modestbranding: true,
            showinfo: false,
            loop: false,
            playsinline: true,
          }}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            onMessage: (event) => {
              console.log("📩 WebView message:", event.nativeEvent.data);
            },
            mediaPlaybackRequiresUserAction: false,
            injectedJavaScript: `
  (function() {
    console.log("🔥 Injected JS started");

    const style = document.createElement('style');
    style.innerHTML = \`
      .ytp-menu-button { display: none !important; }
      .ytp-settings-button { display: none !important; }
      .ytp-button[aria-label*="More"] { display: none !important; }
      .ytp-button[aria-label*="Share"] { display: none !important; }
      .ytp-button[aria-label*="share"] { display: none !important; }
      [aria-label*="Share"] { display: none !important; }
    \`;
    document.head.appendChild(style);

    console.log("✅ CSS injected");

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      console.log("🚫 Right click blocked");
      return false;
    });

    // 👇 SEND MESSAGE TO REACT NATIVE
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "INJECTED_JS", status: "RUNNING" })
    );
  })();
`

          }}
          forceAndroidAutoplay={true}
        />

        {/* Center Play Button when paused */}
        {!isPlaying && (
          <TouchableOpacity
            style={styles.centerPlayButton}
            onPress={() => setIsPlaying(true)}
          >
            <Feather name="play" size={64} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Bar - visible only in portrait mode */}
      {!isLandscape && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionButton} onPress={onShowComments}>
            <Feather name="message-circle" size={24} color={colors.primary} />
            <Text style={styles.actionLabel}>Comments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onShowDoubts}>
            <Feather name="help-circle" size={24} color={colors.primary} />
            <Text style={styles.actionLabel}>Ask Doubt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onShowMyDoubts}>
            <Feather name="list" size={24} color={colors.primary} />
            <Text style={styles.actionLabel}>My Doubts</Text>
          </TouchableOpacity>

          {/* Fullscreen Toggle Button */}
          <TouchableOpacity style={styles.actionButton} onPress={toggleFullscreen}>
            <Feather name="maximize-2" size={24} color={colors.primary} />
            <Text style={styles.actionLabel}>Full Screen</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
  },
  playerWrapper: {
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
    width: '100%',
  },
  centerPlayButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
  },
  actionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  fallbackContainer: {
    height: PLAYER_HEIGHT_PORTRAIT,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#888',
    fontSize: 16,
    marginTop: 12,
  },
});
