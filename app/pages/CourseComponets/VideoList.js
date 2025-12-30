import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../constant/color";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../stores/auth.store";

export default function VideoList({
  videos,
  currentVideo,
              courseId,

  startDate,
  endDate,
  onVideoSelect,
  userId,
}) {
  const { socket } = useSocket();
  const { token } = useAuthStore();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generate all dates between startDate and endDate
  const allDates = useMemo(() => {
    if (!startDate || !endDate) return [];

    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }

    return dates;
  }, [startDate, endDate]);

  // Find today's date index or first available date
  const initialDateIndex = useMemo(() => {
    const todayIndex = allDates.findIndex(date => 
      date.getTime() === today.getTime()
    );
    return todayIndex !== -1 ? todayIndex : 0;
  }, [allDates, today]);

  const [selectedDateIndex, setSelectedDateIndex] = useState(initialDateIndex);

  // Get videos for selected date
  const videosForSelectedDate = useMemo(() => {
    if (!videos || videos.length === 0 || !allDates[selectedDateIndex]) return [];

    const selectedDate = allDates[selectedDateIndex];
    
    return videos.filter(video => {
      const videoDate = video.isLive ? video.DateOfLive : video.dateOfClass;
      if (!videoDate) return false;

      const vDate = new Date(videoDate);
      vDate.setHours(0, 0, 0, 0);

      return vDate.getTime() === selectedDate.getTime();
    }).sort((a, b) => {
      const timeA = a.isLive ? a.TimeOfLIve : a.TimeOfClass;
      const timeB = b.isLive ? b.TimeOfLIve : b.TimeOfClass;
      
      if (!timeA || !timeB) return 0;
      
      const dateTimeA = new Date(`2000-01-01 ${timeA}`);
      const dateTimeB = new Date(`2000-01-01 ${timeB}`);
      
      return dateTimeA - dateTimeB;
    });
  }, [videos, selectedDateIndex, allDates]);

  // Check if video is locked (future video)
  const isVideoLocked = (video) => {
    const videoDate = video.isLive ? video.DateOfLive : video.dateOfClass;
    const videoTime = video.isLive ? video.TimeOfLIve : video.TimeOfClass;
    
    if (!videoDate || !videoTime) return false;

    const videoDateTime = new Date(`${videoDate} ${videoTime}`);
    const now = new Date();

    return videoDateTime > now;
  };

const handleVideoPress = async (video) => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 🔒 Locked class check
    if (isVideoLocked(video)) {
      const dateStr = video.isLive ? video.DateOfLive : video.dateOfClass;
      const timeStr = video.isLive ? video.TimeOfLIve : video.TimeOfClass;

      // Android safe date parse
      const videoDateTime = new Date(
        `${dateStr}T${timeStr}`
      );

      Alert.alert(
        "🔒 Class Not Started Yet",
        `This class will be available on ${videoDateTime.toLocaleString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        [{ text: "OK" }]
      );
      return;
    }

    // ✅ Local state update FIRST
    // onVideoSelect(video);

    // 🔐 Avoid token in URL (recommended)
    const params = new URLSearchParams({
      video: video.url,
      batchId: video?.batchId ?? "",
      userId: String(userId),
      token,
      courseId: String(courseId),
    }).toString();

    const url = `https://www.dikshantias.com/player/?${params}`;

    // 🌐 Open web player
    await Linking.openURL(url);

    // 💬 Join live chat AFTER open
    if (socket && video.isLive && !video.isEnded && userId) {
      socket.emit("join-chat", {
        videoId: video.id,
        userId,
      });
    }
  } catch (err) {
    console.error("Video open failed:", err);
    Alert.alert("Error", "Unable to open video. Please try again.");
  }
};

  const handleDatePress = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDateIndex(index);
  };

  useEffect(() => {
    return () => {
      if (socket && currentVideo?.isLive && userId) {
        socket.emit("leave-chat", {
          videoId: currentVideo.id,
          userId,
        });
      }
    };
  }, [currentVideo?.id, socket, userId]);

  const renderDateItem = ({ item: date, index }) => {
    const isSelected = index === selectedDateIndex;
    const isToday = date.getTime() === today.getTime();
    
    // Count videos for this date
    const videosCount = videos?.filter(video => {
      const videoDate = video.isLive ? video.DateOfLive : video.dateOfClass;
      if (!videoDate) return false;
      const vDate = new Date(videoDate);
      vDate.setHours(0, 0, 0, 0);
      return vDate.getTime() === date.getTime();
    }).length || 0;

    return (
      <TouchableOpacity
        style={[
          styles.dateItem,
          isSelected && styles.dateItemSelected,
          isToday && styles.dateItemToday,
        ]}
        onPress={() => handleDatePress(index)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.dateDayName,
            isSelected && styles.dateTextSelected,
          ]}
        >
          {date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()}
        </Text>
        <Text
          style={[
            styles.dateNumber,
            isSelected && styles.dateTextSelected,
          ]}
        >
          {date.getDate()}
        </Text>
        {videosCount > 0 && (
          <View style={[styles.videoDot, isSelected && styles.videoDotSelected]} />
        )}
        {isToday && (
          <View style={styles.todayIndicator}>
            <Text style={styles.todayText}>Today</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderVideoItem = ({ item, index }) => {
    const isCurrentPlaying = currentVideo?.id === item.id;
    const isLive = item.isLive === true && item.isEnded === false;
    const isDemo = item.isDemo;
    const isLocked = isVideoLocked(item);

    const videoTime = item.isLive ? item.TimeOfLIve : item.TimeOfClass;

    return (
      <TouchableOpacity
        style={[
          styles.videoCard,
          isCurrentPlaying && styles.videoCardActive,
          isLocked && styles.videoCardLocked,
        ]}
        onPress={() => handleVideoPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.videoCardContent}>
          {/* Time Display */}
          <View style={styles.videoTimeContainer}>
            {videoTime && (
              <Text style={[styles.videoTime, isLive && styles.videoTimeLive]}>
                {new Date(`2000-01-01 ${videoTime}`).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            )}
          </View>

          {/* Video Icon */}
          <View
            style={[
              styles.videoIcon,
              isCurrentPlaying && styles.videoIconActive,
              isLive && styles.videoIconLive,
              isLocked && styles.videoIconLocked,
            ]}
          >
            {isLocked ? (
              <Feather name="lock" size={16} color={colors.textMuted} />
            ) : isLive ? (
              <Feather name="radio" size={16} color="#fff" />
            ) : (
              <Feather
                name="video"
                size={16}
                color={isCurrentPlaying ? "#fff" : colors.text}
              />
            )}
          </View>

          {/* Video Info */}
          <View style={styles.videoCardInfo}>
            <View style={styles.videoTitleRow}>
              <Text
                style={[
                  styles.videoTitle,
                  isLocked && styles.videoTitleLocked,
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {isLive && (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
              {isDemo && (
                <View style={styles.demoBadge}>
                  <Text style={styles.demoBadgeText}>DEMO</Text>
                </View>
              )}
              {isLocked && (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>LOCKED</Text>
                </View>
              )}
            </View>

            {item.subject && (
              <Text
                style={[
                  styles.videoSubject,
                  isLocked && styles.videoSubjectLocked,
                ]}
              >
                📖 {item.subject}
              </Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.videoActions}>
            {isCurrentPlaying && !isLocked && (
              <View style={styles.playingIndicator}>
                <Feather name="play-circle" size={24} color={colors.primary} />
              </View>
            )}

            {item.isDownloadable && !isLocked && (
              <TouchableOpacity style={styles.downloadButton}>
                <Feather name="download" size={18} color={colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!videos || videos.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="video-off" size={64} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          No videos have been uploaded yet 🙂
          {"\n"}
          As soon as a video becomes available, you will be notified.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>📚 All Lectures</Text>

      {/* Date Selector */}
      <View style={styles.dateContainer}>
        <FlatList
          data={allDates}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderDateItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
          initialScrollIndex={initialDateIndex}
          getItemLayout={(data, index) => ({
            length: 70,
            offset: 70 * index,
            index,
          })}
        />
      </View>

      {/* Videos for Selected Date */}
      {videosForSelectedDate.length > 0 ? (
        <View style={styles.videosContainer}>
          <Text style={styles.dateTitle}>
            {allDates[selectedDateIndex]?.toLocaleDateString("en-US", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <FlatList
            data={videosForSelectedDate}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderVideoItem}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.noVideosState}>
          <Feather name="calendar" size={48} color={colors.textMuted} />
          <Text style={styles.noVideosText}>
            No classes scheduled for this date
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  dateItem: {
    width: 60,
    height: 70,
    backgroundColor: colors.card,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative",
  },
  dateItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateItemToday: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  dateDayName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textLight,
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
  },
  dateTextSelected: {
    color: "#fff",
  },
  videoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    position: "absolute",
    bottom: 8,
  },
  videoDotSelected: {
    backgroundColor: "#fff",
  },
  todayIndicator: {
    position: "absolute",
    top: -3,
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#fff",
  },
  videosContainer: {
    paddingHorizontal: 16,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  noVideosState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  noVideosText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 12,
  },
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  videoCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    elevation: 3,
    shadowOpacity: 0.2,
  },
  videoCardLocked: {
    opacity: 0.6,
    backgroundColor: colors.background,
  },
  videoCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  videoTimeContainer: {
    minWidth: 65,
    alignItems: "flex-start",
  },
  videoTime: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  videoTimeLive: {
    color: colors.error,
  },
  videoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  videoIconActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  videoIconLive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  videoIconLocked: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  videoCardInfo: {
    flex: 1,
  },
  videoTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
    gap: 6,
  },
  videoTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
  videoTitleLocked: {
    color: colors.textMuted,
  },
  liveBadge: {
    backgroundColor: colors.error,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  demoBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  demoBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  lockedBadge: {
    backgroundColor: colors.textMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  lockedBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  videoSubject: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: "600",
    marginTop: 2,
  },
  videoSubjectLocked: {
    color: colors.textMuted,
  },
  videoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playingIndicator: {
    marginLeft: 4,
  },
  downloadButton: {
    padding: 6,
  },
});