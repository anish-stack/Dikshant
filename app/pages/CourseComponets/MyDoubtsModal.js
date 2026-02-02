import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from "react-native"
import { Feather } from "@expo/vector-icons"
import axios from "axios"
import * as Haptics from "expo-haptics"
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api"
import { useAuthStore } from "../../stores/auth.store"
import { colors } from "../../constant/color"

export default function MyDoubtsModal({
  visible,
  onClose,
  videoId,
  courseId,
  userId
}) {
  const [doubts, setDoubts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const { token } = useAuthStore()

  const fetchDoubts = async (showLoading = true) => {
    if (!token) return

    if (showLoading) setIsLoading(true)
    try {
      const res = await axios.get(`${API_URL_LOCAL_ENDPOINT}/doubt/my`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          course_id: courseId,
          lesson_id: videoId
        }
      })

      const data = res.data?.data || res.data
      setDoubts(data || [])
    } catch (error) {
      console.error("❌ Fetch My Doubts Error:", error.response?.data)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  const handleLikeDoubt = async doubtId => {
    try {
      await axios.post(
        `${API_URL_LOCAL_ENDPOINT}/doubt/${doubtId}/like`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

      // Update local state
      setDoubts(prevDoubts =>
        prevDoubts.map(doubt =>
          doubt.id === doubtId
            ? { ...doubt, likes: (doubt.likes || 0) + 1 }
            : doubt
        )
      )
    } catch (error) {
      console.error("❌ Like Doubt Error:", error)
    }
  }

  const formatTimestamp = seconds => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${mins < 10 ? "0" : ""}${mins}:${
        secs < 10 ? "0" : ""
      }${secs}`
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchDoubts(false)
  }

  useEffect(() => {
    if (visible) {
      fetchDoubts()
    }
  }, [visible, videoId, courseId])

  const renderDoubtItem = ({ item }) => (
    <View style={styles.doubtCard}>
      {/* Status Badge */}
      <View style={styles.doubtCardHeader}>
        <View
          style={[
            styles.statusBadge,
            item.status === "answered" && styles.statusBadgeAnswered,
            item.status === "closed" && styles.statusBadgeClosed
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {item.status === "open"
              ? "🕐 Open"
              : item.status === "answered"
              ? "✅ Answered"
              : "🔒 Closed"}
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
            <Text style={styles.answeredBy}>— {item.answeredBy}</Text>
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
            {item.likes || 0} {item.likes === 1 ? "Like" : "Likes"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.doubtCardTime}>
          {new Date(item.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
          })}
        </Text>
      </View>
    </View>
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📝 My Doubts</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your doubts...</Text>
            </View>
          ) : doubts.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="help-circle" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No Doubts Yet</Text>
              <Text style={styles.emptyText}>
                Ask your first doubt to get started!
              </Text>
            </View>
          ) : (
            <FlatList
              data={doubts}
              keyExtractor={item => item.id.toString()}
              renderItem={renderDoubtItem}
              contentContainerStyle={styles.doubtsList}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)"
  },
  modalContent: {
    flex: 1,
    backgroundColor: colors.card,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    elevation: 8
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32
  },
  loadingText: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLight,
    textAlign: "center",
    marginTop: 8
  },
  doubtsList: {
    padding: 16
  },
  doubtCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  doubtCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.warning
  },
  statusBadgeAnswered: {
    backgroundColor: colors.success
  },
  statusBadgeClosed: {
    backgroundColor: colors.textMuted
  },
  statusBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700"
  },
  timestampBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  timestampBadgeText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: "600"
  },
  doubtCardSubject: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8
  },
  doubtCardQuestion: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
    marginBottom: 12
  },
  answerSection: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  answerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8
  },
  answerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.success
  },
  answerText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 6
  },
  answeredBy: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: "italic"
  },
  doubtCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 20
  },
  likeButtonText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600"
  },
  doubtCardTime: {
    fontSize: 12,
    color: colors.textMuted
  }
})
