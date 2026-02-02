import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Haptics from 'expo-haptics';
import { colors } from '../constant/color';
import LiveChat from '../pages/CourseComponets/LiveChat';
import { useSocket } from '../context/SocketContext';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export default function LiveVideoPlayer({
  video,
  userId,
  onShowComments,
  onShowDoubts,
  onShowMyDoubts,
  onLiveEnded, // Callback when live ends
}) {
  const [isLive, setIsLive] = useState(true);
  const [canJoin, setCanJoin] = useState(false);
  const [timeToLive, setTimeToLive] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);

  const { socket, isConnected } = useSocket();

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const checkLiveStatus = () => {
    if (!video.DateOfLive || !video.TimeOfLIve) {
      setCanJoin(false);
      return;
    }

    const liveDateTime = new Date(`${video.DateOfLive} ${video.TimeOfLIve}`);
    const now = new Date();
    const timeDiff = liveDateTime.getTime() - now.getTime();
    const minutesDiff = Math.floor(timeDiff / (1000 * 60));

    // Assume live session duration is 2 hours
    const sessionDurationMinutes = 120;
    const minutesSinceStart = -minutesDiff;

    // Live has ended
    if (minutesSinceStart > sessionDurationMinutes) {
      setHasEnded(true);
      setCanJoin(false);
      setIsLive(false);
      setTimeToLive('✅ Live session ended');
      
      // Notify parent component
      if (onLiveEnded) {
        onLiveEnded();
      }
      return;
    }

    // Can join (5 mins before to during session)
    if (minutesDiff <= 5 && minutesSinceStart <= sessionDurationMinutes) {
      setCanJoin(true);
      if (minutesDiff <= 0) {
        setIsLive(true);
        setTimeToLive('🔴 LIVE NOW');
      } else {
        setTimeToLive(`⏰ Starts in ${minutesDiff} minutes`);
      }
    } else if (minutesDiff > 5) {
      setCanJoin(false);
      setTimeToLive(`⏱️ Starts at ${liveDateTime.toLocaleTimeString()}`);
    }
  };

  useEffect(() => {
    // Check if already marked as ended in video data
    if (video.isLiveEnded === true) {
      setHasEnded(true);
      setCanJoin(false);
      setIsLive(false);
      setTimeToLive('✅ Live session ended');
      if (onLiveEnded) {
        onLiveEnded();
      }
      return;
    }

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 60000);
    return () => clearInterval(interval);
  }, [video]);

  const handleJoinLive = () => {
    if (!canJoin) {
      Alert.alert(
        'Cannot Join',
        'You can only join 5 minutes before the live session starts.'
      );
      return;
    }

    if (socket && isConnected) {
      socket.emit('join-live-session', {
        videoId: video.id,
        userId: userId,
        userName: 'Student',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  useEffect(() => {
    if (!socket) return;

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
        
        // If server says live has ended
        if (data.hasEnded) {
          setHasEnded(true);
          setCanJoin(false);
          if (onLiveEnded) {
            onLiveEnded();
          }
        }
      }
    };

    socket.on('user-joined-live', handleUserJoined);
    socket.on('user-left-live', handleUserLeft);
    socket.on('live-session-update', handleLiveUpdate);

    return () => {
      socket.off('user-joined-live', handleUserJoined);
      socket.off('user-left-live', handleUserLeft);
      socket.off('live-session-update', handleLiveUpdate);
    };
  }, [socket, video.id]);

  const videoId = getYouTubeId(video?.url);

  // Show ended state with option to watch recording
  if (hasEnded) {
    return (
      <View style={styles.container}>
        <View style={styles.endedContainer}>
          <Feather name="check-circle" size={64} color={colors.success} />
          <Text style={styles.endedTitle}>Live Session Ended</Text>
          <Text style={styles.endedSubtext}>
            This live session has concluded. You can now watch the recording.
          </Text>
          <TouchableOpacity 
            style={styles.watchRecordingButton}
            onPress={onLiveEnded}
          >
            <Feather name="play-circle" size={20} color="#fff" />
            <Text style={styles.watchRecordingText}>Watch Recording</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Live Status Header */}
      <View style={styles.liveHeader}>
        <View style={styles.liveStatusContainer}>
          <View style={[styles.liveIndicator, isLive && styles.liveIndicatorActive]} />
          <Text style={styles.liveStatus}>{timeToLive}</Text>
        </View>
        
        {viewerCount > 0 && (
          <View style={styles.viewerCount}>
            <Feather name="eye" size={14} color={colors.textLight} />
            <Text style={styles.viewerCountText}>{viewerCount} watching</Text>
          </View>
        )}
      </View>

      <View style={styles.playerBackground}>
        {canJoin ? (
          <YoutubePlayer
            height={isTablet ? 400 : 240}
            width={width}
            videoId={videoId}
            play={isLive}
            initialPlayerParams={{
              controls: true,
              rel: false,
              modestbranding: true,
              fs: true,
              playsinline: 1,
              autoplay: isLive ? 1 : 0,
            }}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        ) : (
          <View style={styles.lockedPlayer}>
            <Feather name="lock" size={64} color={colors.textMuted} />
            <Text style={styles.lockedText}>Live session not available</Text>
            <Text style={styles.lockedSubtext}>{timeToLive}</Text>
          </View>
        )}

        {/* Video Title & Actions */}
        <View style={styles.playerHeader}>
          <View style={styles.titleSection}>
            <Text style={styles.playerTitle} numberOfLines={2}>
              🔴 {video.title}
            </Text>
            <Text style={styles.playerSubtitle}>Live Session</Text>
          </View>

          <View style={styles.playerActions}>
            {!canJoin && !hasEnded && (
              <TouchableOpacity 
                onPress={handleJoinLive} 
                style={[styles.joinButton, canJoin && styles.joinButtonActive]}
              >
                <Text style={styles.joinButtonText}>Waiting...</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        {isLive && canJoin && (
          <TouchableOpacity 
            style={styles.actionBarButton} 
            onPress={() => setShowChat(true)}
          >
            <Feather name="message-square" size={22} color={colors.primary} />
            <Text style={styles.actionBarLabel}>Live Chat</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionBarButton} onPress={onShowDoubts}>
          <Feather name="help-circle" size={22} color={colors.primary} />
          <Text style={styles.actionBarLabel}>Ask Doubt</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBarButton} onPress={onShowMyDoubts}>
          <Feather name="list" size={22} color={colors.primary} />
          <Text style={styles.actionBarLabel}>My Doubts</Text>
        </TouchableOpacity>
      </View>

      {/* Live Chat Bottom Sheet */}
      <LiveChat
        videoId={video.id}
        userId={userId}
        visible={showChat && isLive && canJoin}
        onClose={() => setShowChat(false)}
        onLiveCountChange={setViewerCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  endedContainer: {
    backgroundColor: colors.card,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  endedSubtext: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  watchRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  watchRecordingText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  liveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  liveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.textMuted,
  },
  liveIndicatorActive: {
    backgroundColor: colors.error,
  },
  liveStatus: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerCountText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  playerBackground: {
    backgroundColor: '#000',
    position: 'relative',
  },
  lockedPlayer: {
    height: isTablet ? 400 : 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  lockedText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 16,
  },
  lockedSubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 8,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  playerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  playerSubtitle: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  playerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.textMuted,
  },
  joinButtonActive: {
    backgroundColor: colors.primary,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
  },
  actionBarButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  actionBarLabel: {
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
    fontWeight: '600',
  },
});