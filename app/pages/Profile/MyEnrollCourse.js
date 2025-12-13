import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Slider,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import YoutubePlayer from "react-native-youtube-iframe";
import useSWR from "swr";
import { fetcher } from "../../constant/fetcher";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";
import axios from "axios";

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;

const colors = {
  primary: "#EF4444",
  primaryLight: "#EEF2FF",
  primaryDark: "#4F46E5",
  accent: "#EC4899",
  background: "#FAFAFA",
  card: "#FFFFFF",
  text: "#1F2937",
  textLight: "#6B7280",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  shadow: "rgba(0, 0, 0, 0.1)",
};

// Automatic progress tracking
const saveProgress = async (userId, videoId, batchId, watched, duration) => {
  if (!userId || !videoId || !batchId) return;

  const payload = {
    userId,
    videoId,
    batchId,
    watched: Math.floor(watched),
    duration: Math.floor(duration || 3600),
    percentage: Math.min(100, Math.round((Math.floor(watched) / (duration || 3600)) * 100)),
    lastPosition: Math.floor(watched),
    lastWatchedAt: new Date().toISOString(),
    completedAt: Math.floor(watched) / (duration || 3600) > 0.95 ? new Date().toISOString() : null,
  };

  try {
    const response = await fetch(`${API_URL_LOCAL_ENDPOINT}/courseprogresss`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      console.log("✅ Progress saved:", payload.percentage + "%");
    }
  } catch (error) {
    console.log("❌ Progress save failed:", error.message);
  }
};

const fetchProgress = async (userId, videoId) => {
  try {
    const response = await fetch(
      `${API_URL_LOCAL_ENDPOINT}/courseprogresss/${userId}/${videoId}`,
      { method: "GET" }
    );
    if (response.ok) {
      const data = await response.json();
      return data[0]?.lastPosition || 0;
    }
  } catch (error) {
    console.log("Fetch progress error:", error.message);
  }
  return 0;
};

export default function MyEnrollCourse() {
  const route = useRoute();
  const navigation = useNavigation();
  const { courseId, unlocked = false, userId } = route.params || {};
  const { user, token } = useAuthStore();
  
  // Video Player States
  const [currentVideo, setCurrentVideo] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  
  // Comments States
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  
  // Doubts States
  const [showDoubts, setShowDoubts] = useState(false);
  const [showMyDoubts, setShowMyDoubts] = useState(false);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myDoubts, setMyDoubts] = useState([]);
  const [isLoadingDoubts, setIsLoadingDoubts] = useState(false);
  const [refreshingDoubts, setRefreshingDoubts] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState(null);
  
  const playerRef = useRef(null);
  const progressInterval = useRef(null);

  const { data: batchData, isLoading: batchLoading } = useSWR(
    courseId ? `/batchs/${courseId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: videosData, isLoading: videosLoading } = useSWR(
    unlocked ? `/videocourses/batch/${courseId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const videos = videosData?.data || [];

  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatTimestamp = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const playVideo = async (video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentVideo(video);
    setCurrentTime(0);
    setIsPlaying(true);
    setShowComments(false);
    setShowDoubts(false);
    setShowMyDoubts(false);

    const savedPosition = await fetchProgress(user?.id, video.id);
    if (savedPosition > 0) {
      setTimeout(() => {
        playerRef.current?.seekTo(savedPosition, true);
        setCurrentTime(savedPosition);
      }, 500);
    }

    // Load mock comments
    setComments([
      {
        id: 1,
        user: "Priya Singh",
        avatar: "👩",
        text: "Great explanation! This concept was confusing before.",
        timestamp: "2 mins ago",
        likes: 12,
      },
      {
        id: 2,
        user: "Amit Kumar",
        avatar: "👨",
        text: "Can you solve the example problem at 15:30?",
        timestamp: "1 min ago",
        likes: 5,
      },
    ]);

    // Fetch doubts for this video
    fetchMyDoubtsForVideo(video.id);
  };

  // Fetch user's doubts for current video
  const fetchMyDoubtsForVideo = async (lessonId = null) => {
    if (!token) return;
    
    setIsLoadingDoubts(true);
    try {
      const res = await axios.get(`${API_URL_LOCAL_ENDPOINT}/doubt/my`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          course_id: courseId,
          lesson_id: lessonId || currentVideo?.id,
        },
      });

      console.log("✅ My Doubts:", res.data);
      const data = res.data || res.data.data
      setMyDoubts(data || []);
    } catch (error) {
      console.error("❌ Fetch My Doubts Error:", error.response.data);
    } finally {
      setIsLoadingDoubts(false);
      setRefreshingDoubts(false);
    }
  };

  // Submit a new doubt
  const handleAskDoubt = async () => {
    if (!subject.trim() || !question.trim()) {
      Alert.alert("Error", "Please enter subject and your doubt");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        subject: subject.trim(),
        question: question.trim(),
        courseId: courseId || null,
        lessonId: currentVideo?.id || null,
        attachmentUrl: attachmentUrl.trim() || null,
        videoTimestamp: videoTimestamp || Math.floor(currentTime),
      };

      const res = await axios.post(
        `${API_URL_LOCAL_ENDPOINT}/doubt`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("✅ Doubt Submitted:", res.data);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Your doubt has been submitted successfully");

      // Reset form
      setSubject("");
      setQuestion("");
      setAttachmentUrl("");
      setVideoTimestamp(null);
      setShowDoubts(false);

      // Refresh doubts list
      fetchMyDoubtsForVideo(currentVideo?.id);
    } catch (error) {
      console.error("❌ Ask Doubt Error:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to submit doubt"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Like a doubt
  const handleLikeDoubt = async (doubtId) => {
    try {
      await axios.post(
        `${API_URL_LOCAL_ENDPOINT}/doubt/${doubtId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Update local state
      setMyDoubts(prevDoubts =>
        prevDoubts.map(doubt =>
          doubt.id === doubtId
            ? { ...doubt, likes: (doubt.likes || 0) + 1 }
            : doubt
        )
      );
    } catch (error) {
      console.error("❌ Like Doubt Error:", error);
    }
  };

  // Capture current video timestamp
  const captureTimestamp = () => {
    setVideoTimestamp(Math.floor(currentTime));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Automatic progress tracking every 10 seconds
  useEffect(() => {
    if (!currentVideo || !isPlaying) {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      return;
    }

    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    progressInterval.current = setInterval(() => {
      if (currentTime > 0) {
        saveProgress(user?.id, currentVideo.id, courseId, currentTime, videoDuration);
      }
    }, 10000);

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [currentVideo, currentTime, videoDuration, isPlaying, user?.id, courseId]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const newCommentObj = {
      id: comments.length + 1,
      user: user?.name || "You",
      avatar: user?.avatar || "👤",
      text: newComment,
      timestamp: "now",
      likes: 0,
    };

    setComments([newCommentObj, ...comments]);
    setNewComment("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleBookmark = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("✅ Bookmarked", `${currentVideo?.title} added to bookmarks`);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOpenDoubts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDoubts(true);
    setVideoTimestamp(Math.floor(currentTime)); // Auto-capture timestamp
  };

  const handleViewMyDoubts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMyDoubts(true);
    fetchMyDoubtsForVideo(currentVideo?.id);
  };

  if (batchLoading || videosLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your course...</Text>
      </SafeAreaView>
    );
  }

  if (!unlocked) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.lockedView}>
          <Feather name="lock" size={80} color={colors.primary} />
          <Text style={styles.lockedTitle}>Course Locked</Text>
          <Text style={styles.lockedText}>Please enroll to watch videos</Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercentage = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;
  const videoId = currentVideo ? getYouTubeId(currentVideo.url) : null;

  return (
    <SafeAreaView style={styles.container}>
      {currentVideo && (
        <>
          {/* Player Container */}
          <View style={styles.playerContainer}>
            <View style={styles.playerBackground}>
              <YoutubePlayer
                ref={playerRef}
                height={isTablet ? 400 : 240}
                width={width}
                videoId={videoId}
                play={isPlaying}
                volume={isMuted ? 0 : volume}
                playbackRate={playbackSpeed}
                onProgress={(data) => {
                  setCurrentTime(data.currentTime);
                  setVideoDuration(data.duration);
                }}
                onChangeState={(state) => {
                  if (state === "playing") setIsPlaying(true);
                  if (state === "paused") setIsPlaying(false);
                }}
                initialPlayerParams={{
                  controls: false,
                  rel: false,
                  modestbranding: true,
                  fs: false,
                  playsinline: 1,
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                }}
              />

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(progressPercentage, 100)}%` },
                  ]}
                />
              </View>

              {/* Video Title & Actions */}
              <View style={styles.playerHeader}>
                <View style={styles.titleSection}>
                  <Text style={styles.playerTitle} numberOfLines={2}>
                    {currentVideo.title}
                  </Text>
                  <Text style={styles.playerTime}>
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </Text>
                </View>

                <View style={styles.playerActions}>
                  <TouchableOpacity onPress={handleBookmark} style={styles.iconButton}>
                    <Feather name="bookmark" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Action Bar */}
            <View style={styles.actionBar}>
              {/* <TouchableOpacity
                style={[
                  styles.actionBarButton,
                  showComments && styles.actionBarButtonActive,
                ]}
                onPress={() => {
                  setShowComments(!showComments);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Feather name="message-circle" size={22} color={colors.primary} />
                <Text style={styles.actionBarLabel}>Comments</Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={styles.actionBarButton}
                onPress={handleOpenDoubts}
              >
                <Feather name="help-circle" size={22} color={colors.primary} />
                <Text style={styles.actionBarLabel}>Ask Doubt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBarButton}
                onPress={handleViewMyDoubts}
              >
                <Feather name="list" size={22} color={colors.primary} />
                <Text style={styles.actionBarLabel}>My Doubts</Text>
                {myDoubts.length > 0 && (
                  <View style={styles.doubtBadge}>
                    <Text style={styles.doubtBadgeText}>{myDoubts.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Comments Section */}
            {showComments && (
              <View style={styles.commentsPanel}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentTitle}>💬 Comments & Discussion</Text>
                  <TouchableOpacity onPress={() => setShowComments(false)}>
                    <Feather name="x" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={comments}
                  keyExtractor={(item) => item.id.toString()}
                  scrollEnabled={true}
                  style={styles.commentsList}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Text style={styles.commentAvatar}>{item.avatar}</Text>
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader2}>
                          <Text style={styles.commentUser}>{item.user}</Text>
                          <Text style={styles.commentTime}>{item.timestamp}</Text>
                        </View>
                        <Text style={styles.commentText}>{item.text}</Text>
                        <View style={styles.commentActions}>
                          <TouchableOpacity style={styles.commentAction}>
                            <Feather name="thumbs-up" size={14} color={colors.primary} />
                            <Text style={styles.commentActionText}>{item.likes}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.commentAction}>
                            <Feather name="corner-up-left" size={14} color={colors.primary} />
                            <Text style={styles.commentActionText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                />

                <KeyboardAvoidingView behavior="padding" style={styles.addCommentBox}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.textMuted}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.commentSendBtn}
                    onPress={handleAddComment}
                  >
                    <Feather name="send" size={18} color="#fff" />
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              </View>
            )}
          </View>
        </>
      )}

      {/* Video List */}
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          !currentVideo ? (
            <>
              <View style={styles.courseInfo}>
                <Image
                  source={{
                    uri: batchData?.imageUrl || "https://via.placeholder.com/300",
                  }}
                  style={styles.courseImage}
                />
                <View style={styles.courseDetails}>
                  <Text style={styles.courseName}>{batchData?.name || "Course"}</Text>
                  <Text style={styles.courseDesc}>
                    {batchData?.shortDescription || "Loading..."}
                  </Text>
                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Feather name="video" size={14} color={colors.primary} />
                      <Text style={styles.metaText}>{videos.length} Videos</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>📚 All Lectures</Text>
            </>
          ) : null
        }
        renderItem={({ item, index }) => {
          const isCurrentPlaying = currentVideo?.id === item.id;

          return (
            <TouchableOpacity
              style={[
                styles.videoCard,
                isCurrentPlaying && styles.videoCardActive,
              ]}
              onPress={() => playVideo(item)}
              activeOpacity={0.7}
            >
              <View style={styles.videoCardContent}>
                <View style={[
                  styles.videoNumber,
                  isCurrentPlaying && styles.videoNumberActive
                ]}>
                  <Text style={styles.videoNumberText}>{index + 1}</Text>
                </View>

                <View style={styles.videoCardInfo}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subject && (
                    <Text style={styles.videoSubject}>📖 {item.subject}</Text>
                  )}
                </View>

                {isCurrentPlaying && (
                  <View style={styles.playingIndicator}>
                    <Feather name="play-circle" size={28} color={colors.primary} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Ask Doubt Modal */}
      <Modal
        visible={showDoubts}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDoubts(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.doubtModal}>
          <View style={styles.doubtContent}>
            <View style={styles.doubtHeader}>
              <Text style={styles.doubtTitle}>❓ Ask Your Doubt</Text>
              <TouchableOpacity onPress={() => setShowDoubts(false)}>
                <Feather name="x" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
           
              {/* Subject Input */}
              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.doubtSubjectInput}
                placeholder="e.g., Quadratic Equations"
                placeholderTextColor={colors.textMuted}
                value={subject}
                onChangeText={setSubject}
              />

              {/* Question Input */}
              <Text style={styles.inputLabel}>Your Doubt *</Text>
              <TextInput
                style={styles.doubtInput}
                placeholder="Describe your doubt in detail..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                value={question}
                onChangeText={setQuestion}
              />

     
              <TouchableOpacity
                style={[
                  styles.submitDoubtBtn,
                  isSubmitting && styles.submitDoubtBtnDisabled
                ]}
                onPress={handleAskDoubt}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitDoubtBtnText}>Submit Doubt</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.doubtInfo}>
                ⚡ Your doubt will be answered by instructors within 10 min
              </Text>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* My Doubts Modal */}
      <Modal
        visible={showMyDoubts}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMyDoubts(false)}
      >
        <View style={styles.myDoubtsModal}>
          <View style={styles.myDoubtsContent}>
            <View style={styles.doubtHeader}>
              <Text style={styles.doubtTitle}>📝 My Doubts</Text>
              <TouchableOpacity onPress={() => setShowMyDoubts(false)}>
                <Feather name="x" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {isLoadingDoubts ? (
              <View style={styles.loadingDoubts}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingDoubtsText}>Loading your doubts...</Text>
              </View>
            ) : myDoubts.length === 0 ? (
              <View style={styles.emptyDoubts}>
                <Feather name="help-circle" size={64} color={colors.textMuted} />
                <Text style={styles.emptyDoubtsTitle}>No Doubts Yet</Text>
                <Text style={styles.emptyDoubtsText}>
                  Ask your first doubt to get started!
                </Text>
              </View>
            ) : (
              <FlatList
                data={myDoubts}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.doubtsList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshingDoubts}
                    onRefresh={() => {
                      setRefreshingDoubts(true);
                      fetchMyDoubtsForVideo(currentVideo?.id);
                    }}
                    colors={[colors.primary]}
                  />
                }
                renderItem={({ item }) => (
                  <View style={styles.doubtCard}>
                    {/* Status Badge */}
                    <View style={styles.doubtCardHeader}>
                      <View style={[
                        styles.statusBadge,
                        item.status === 'answered' && styles.statusBadgeAnswered,
                        item.status === 'closed' && styles.statusBadgeClosed
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {item.status === 'open' ? '🕐 Open' :
                           item.status === 'answered' ? '✅ Answered' : '🔒 Closed'}
                        </Text>
                      </View>

                      {item.videoTimestamp && (
                        <View style={styles.timestampBadge}>
                          <Feather name="clock" size={12} color={colors.textLight} />
                          <Text style={styles.timestampBadgeText}>
                            {formatTimestamp(item.videoTimestamp)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Subject */}
                    <Text style={styles.doubtCardSubject}>{item.subject}</Text>

                    {/* Question */}
                    <Text style={styles.doubtCardQuestion} numberOfLines={3}>
                      {item.question}
                    </Text>

                    {/* Answer Section */}
                    {item.answer && (
                      <View style={styles.answerSection}>
                        <View style={styles.answerHeader}>
                          <Feather name="message-square" size={16} color={colors.success} />
                          <Text style={styles.answerLabel}>Answer:</Text>
                        </View>
                        <Text style={styles.answerText}>{item.answer}</Text>
                        {item.answeredBy && (
                          <Text style={styles.answeredBy}>
                            — {item.answeredBy}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Footer Actions */}
                    <View style={styles.doubtCardFooter}>
                      <TouchableOpacity
                        style={styles.likeButton}
                        onPress={() => handleLikeDoubt(item.id)}
                      >
                        <Feather name="thumbs-up" size={16} color={colors.primary} />
                        <Text style={styles.likeButtonText}>
                          {item.likes || 0} {item.likes === 1 ? 'Like' : 'Likes'}
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.doubtCardTime}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  lockedView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  lockedTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 20,
  },
  lockedText: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 10,
  },
  playerContainer: {
    backgroundColor: "#000",
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  playerBackground: {
    backgroundColor: "#000",
    position: "relative",
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  playerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 4,
  },
  playerTime: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "600",
  },
  playerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: "space-around",
  },
  actionBarButton: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 80,
    position: "relative",
  },
  actionBarButtonActive: {
    backgroundColor: colors.primaryLight,
  },
  actionBarLabel: {
    fontSize: 11,
    color: colors.text,
    marginTop: 4,
    fontWeight: "600",
  },
  doubtBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  doubtBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  commentsPanel: {
    maxHeight: height * 0.4,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  commentTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  commentAvatar: {
    fontSize: 28,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader2: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  commentText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: "row",
    gap: 16,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  addCommentBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentSendBtn: {
    marginLeft: 10,
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  content: {
    padding: 16,
  },
  courseInfo: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courseImage: {
    width: 110,
    height: 110,
    borderRadius: 12,
  },
  courseDetails: {
    flex: 1,
    justifyContent: "center",
  },
  courseName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  courseDesc: {
    fontSize: 13,
    color: colors.textLight,
    marginBottom: 10,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metaText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 16,
  },
  videoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
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
  videoCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  videoNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  videoNumberActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  videoNumberText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 15,
  },
  videoCardInfo: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    lineHeight: 20,
  },
  videoSubject: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "600",
  },
  playingIndicator: {
    marginLeft: 12,
  },
  doubtModal: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  doubtContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
    maxHeight: height * 0.85,
    elevation: 8,
  },
  doubtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  doubtTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  timestampContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  timestampInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timestampText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700",
  },
  captureButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  captureButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  doubtSubjectInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
  doubtInput: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    textAlignVertical: "top",
    minHeight: 120,
  },
  submitDoubtBtn: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitDoubtBtnDisabled: {
    opacity: 0.6,
  },
  submitDoubtBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  doubtInfo: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 18,
  },
  myDoubtsModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  myDoubtsContent: {
    flex: 1,
    backgroundColor: colors.card,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    elevation: 8,
  },
  loadingDoubts: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingDoubtsText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 16,
  },
  emptyDoubts: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyDoubtsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
  },
  emptyDoubtsText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 8,
  },
  doubtsList: {
    padding: 16,
  },
  doubtCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doubtCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.warning,
  },
  statusBadgeAnswered: {
    backgroundColor: colors.success,
  },
  statusBadgeClosed: {
    backgroundColor: colors.textMuted,
  },
  statusBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  timestampBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timestampBadgeText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: "600",
  },
  doubtCardSubject: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  doubtCardQuestion: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  answerSection: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.success,
  },
  answerText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  answeredBy: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: "italic",
  },
  doubtCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
  },
  likeButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
  },
  doubtCardTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
});