import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "../../constant/color";
import { useSocket } from "../../context/SocketContext";
import { useAuthStore } from "../../stores/auth.store";
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get("window");

export default function VideoList({
  videos,
  currentVideo,
  courseId,
  subjectId,
  startDate,
  endDate,
  onVideoSelect,
  userId,
}) {
  const { socket } = useSocket();
  const { token } = useAuthStore();
  const navigation = useNavigation()
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Locked video modal state
  const [lockedModalVisible, setLockedModalVisible] = useState(false);
  const [lockedVideoInfo, setLockedVideoInfo] = useState(null);
  const modalScale = useState(new Animated.Value(0))[0];

  // Generate all months between startDate and endDate
  const allMonths = useMemo(() => {
    if (!startDate || !endDate) return [];

    const months = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }, [startDate, endDate]);

  // Find current month index
  const initialMonthIndex = useMemo(() => {
    const currentMonthIndex = allMonths.findIndex(
      (month) =>
        month.getMonth() === today.getMonth() &&
        month.getFullYear() === today.getFullYear()
    );
    return currentMonthIndex !== -1 ? currentMonthIndex : 0;
  }, [allMonths, today]);

  const [selectedMonthIndex, setSelectedMonthIndex] = useState(initialMonthIndex);

  // Generate dates for selected month
  const datesInSelectedMonth = useMemo(() => {
    if (!allMonths[selectedMonthIndex]) return [];

    const month = allMonths[selectedMonthIndex];
    const year = month.getFullYear();
    const monthNum = month.getMonth();

    const firstDay = new Date(year, monthNum, 1);
    const lastDay = new Date(year, monthNum + 1, 0);

    const dates = [];
    for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date));
    }

    return dates;
  }, [selectedMonthIndex, allMonths]);

  const [selectedDateIndex, setSelectedDateIndex] = useState(() => {
    const todayIndex = datesInSelectedMonth.findIndex(
      (date) => date.getTime() === today.getTime()
    );
    return todayIndex !== -1 ? todayIndex : 0;
  });


  // Get videos for selected date
  const videosForSelectedDate = useMemo(() => {
    if (!videos || videos.length === 0 || !datesInSelectedMonth[selectedDateIndex]) return [];

    const selectedDate = datesInSelectedMonth[selectedDateIndex];

    return videos
      .filter((video) => {
        const videoDate = video.isLive ? video.DateOfLive : video.dateOfClass;
        if (!videoDate) return false;

        const vDate = new Date(videoDate);
        vDate.setHours(0, 0, 0, 0);

        return vDate.getTime() === selectedDate.getTime();
      })
      .sort((a, b) => {
        const timeA = a.isLive ? a.TimeOfLIve : a.TimeOfClass;
        const timeB = b.isLive ? b.TimeOfLIve : b.TimeOfClass;

        if (!timeA || !timeB) return 0;

        const dateTimeA = new Date(`2000-01-01 ${timeA}`);
        const dateTimeB = new Date(`2000-01-01 ${timeB}`);

        return dateTimeA - dateTimeB;
      });
  }, [videos, selectedDateIndex, datesInSelectedMonth]);

  // Check if video is locked
  const isVideoLocked = (video) => {
    const videoDate = video.isLive ? video.DateOfLive : video.dateOfClass;
    const videoTime = video.isLive ? video.TimeOfLIve : video.TimeOfClass;

    if (!videoDate || !videoTime) return false;

    const videoDateTime = new Date(`${videoDate}T${videoTime}`);
    const now = new Date();

    return videoDateTime > now;
  };

  // Show locked modal with animation
  const showLockedModal = (video) => {
    const dateStr = video.isLive ? video.DateOfLive : video.dateOfClass;
    const timeStr = video.isLive ? video.TimeOfLIve : video.TimeOfClass;
    const videoDateTime = new Date(`${dateStr}T${timeStr}`);

    setLockedVideoInfo({
      title: video.title,
      date: videoDateTime.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: videoDateTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    });

    setLockedModalVisible(true);

    Animated.spring(modalScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const hideLockedModal = () => {
    Animated.timing(modalScale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setLockedModalVisible(false);
      setLockedVideoInfo(null);
    });
  };

  const handleVideoPress = async (video) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 🔒 Locked class check
      if (isVideoLocked(video)) {
        showLockedModal(video);
        return;
      }

      // 🔐 Open video with secure token
      const params = new URLSearchParams({
        video: video.secureToken,
        batchId: video?.batchId ?? "",
        userId: String(userId),
        token,
        courseId: String(courseId),
      }).toString();

      // const url = `http://192.168.1.4:5173/?${params}`;
      // console.log(url)
      // 
      // await Linking.openURL(url);
      navigation.navigate("PlayerScreen", {
        video: video.secureToken,
        batchId: video?.batchId ?? "",
        userId: String(userId),
        token,
        videoId:video?.id,
        courseId: String(courseId),
      })

      // 💬 Join live chat
      if (socket && video.isLive && !video.isEnded && userId) {
        socket.emit("join-chat", {
          videoId: video.id,
          userId,
        });
      }
    } catch (err) {
      console.error("Video open failed:", err);
    }
  };

  const handleMonthPress = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonthIndex(index);
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

  const renderMonthItem = ({ item: month, index }) => {
    const isSelected = index === selectedMonthIndex;
    const isCurrentMonth =
      month.getMonth() === today.getMonth() &&
      month.getFullYear() === today.getFullYear();

    // Count videos for this month
    const videosCount =
      videos?.filter((video) => {
        const videoDate = video.isLive ? video.DateOfLive : video.dateOfClass;
        if (!videoDate) return false;
        const vDate = new Date(videoDate);
        return (
          vDate.getMonth() === month.getMonth() &&
          vDate.getFullYear() === month.getFullYear()
        );
      }).length || 0;

    return (
      <TouchableOpacity
        style={[
          styles.monthItem,
          isSelected && styles.monthItemSelected,
          isCurrentMonth && styles.monthItemCurrent,
        ]}
        onPress={() => handleMonthPress(index)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.monthName,
            isSelected && styles.monthTextSelected,
          ]}
        >
          {month.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
        </Text>
        <Text
          style={[
            styles.monthYear,
            isSelected && styles.monthTextSelected,
          ]}
        >
          {month.getFullYear()}
        </Text>
        {videosCount > 0 && (
          <View style={styles.monthVideoBadge}>
            <Text style={styles.monthVideoBadgeText}>{videosCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDateItem = ({ item: date, index }) => {
    const isSelected = index === selectedDateIndex;
    const isToday = date.getTime() === today.getTime();

    // Count videos for this date
    const videosCount =
      videos?.filter((video) => {
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

  const renderVideoItem = ({ item }) => {
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
                  <View style={styles.liveDot} />
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
                  <Feather name="lock" size={10} color="#fff" />
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
        <View style={styles.emptyIconContainer}>
          <Feather name="video-off" size={64} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No Videos Yet</Text>
        <Text style={styles.emptyText}>
          Videos will appear here once they're uploaded. You'll be notified when new content is
          available.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.mainTitle}>📚 All Lectures</Text>

        <TouchableOpacity onPress={() => navigation.navigate('my-course-subjects',
          { courseId: courseId, unlocked: true })}>
          <Text style={styles.viewAllText}>All Content </Text>
        </TouchableOpacity>
      </View>

      {/* Month Selector */}
      <View style={styles.monthContainer}>
        <FlatList
          data={allMonths}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderMonthItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthList}
          initialScrollIndex={initialMonthIndex}
          getItemLayout={(data, index) => ({
            length: 85,
            offset: 85 * index,
            index,
          })}
        />
      </View>

      {/* Date Selector */}
      <View style={styles.dateContainer}>
        <FlatList
          data={datesInSelectedMonth}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderDateItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
          initialScrollIndex={selectedDateIndex}
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
            {datesInSelectedMonth[selectedDateIndex]?.toLocaleDateString("en-US", {
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
          <View style={styles.noVideosIconContainer}>
            <Feather name="calendar" size={48} color={colors.textMuted} />
          </View>
          <Text style={styles.noVideosTitle}>No Classes Today</Text>
          <Text style={styles.noVideosText}>
            There are no scheduled classes for this date. Check other dates or come back later.
          </Text>
        </View>
      )}

      {/* Locked Video Modal */}
      <Modal
        visible={lockedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={hideLockedModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={hideLockedModal}
          />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: modalScale }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Feather name="lock" size={32} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Class Locked</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalVideoTitle} numberOfLines={2}>
                {lockedVideoInfo?.title}
              </Text>

              <View style={styles.modalInfoCard}>
                <View style={styles.modalInfoRow}>
                  <Feather name="calendar" size={18} color={colors.primary} />
                  <Text style={styles.modalInfoText}>{lockedVideoInfo?.date}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Feather name="clock" size={18} color={colors.primary} />
                  <Text style={styles.modalInfoText}>{lockedVideoInfo?.time}</Text>
                </View>
              </View>

              <Text style={styles.modalDescription}>
                This class will be available at the scheduled time. You'll receive a notification
                when it starts.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={hideLockedModal}
                activeOpacity={0.8}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 20,
    paddingHorizontal: 16,
  },

  // Month Selector Styles
  monthContainer: {
    marginBottom: 16,
  },
  monthList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  monthItem: {
    minWidth: 75,
    height: 65,
    backgroundColor: colors.card,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 12,
    position: "relative",
  },
  monthItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  monthItemCurrent: {
    borderColor: colors.success,
    borderWidth: 2.5,
  },
  monthName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  monthYear: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textLight,
  },
  monthTextSelected: {
    color: "#fff",
  },
  monthVideoBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  monthVideoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Date Selector Styles
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
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  dateItemToday: {
    borderColor: colors.success,
    borderWidth: 2.5,
  },
  dateDayName: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textLight,
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: 16,
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

  // Videos List Styles
  videosContainer: {
    paddingHorizontal: 16,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
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
    flexWrap: "wrap",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.error,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  liveBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  demoBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  demoBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.textMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
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

  // Empty States
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: colors.card,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 20,
  },
  noVideosState: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  noVideosIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: colors.card,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  noVideosTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  noVideosText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 19,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: colors.card,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalVideoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInfoCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 12,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalInfoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.textLight,
    lineHeight: 19,
    textAlign: "center",
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  mainTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },

  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB", // blue
  },
});