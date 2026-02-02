import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { colors } from "../../constant/color";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const API_BASE = API_URL_LOCAL_ENDPOINT;

export default function CommentsPanel({ visible, onClose, videoId, userId }) {
  const { token } = useAuthStore();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const api = axios.create({
    baseURL: API_BASE,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const loadComments = useCallback(async () => {
    if (!videoId || !token) return;
    setLoading(true);
    try {
      const res = await api.get(`/comments/video/${videoId}`);
      if (res.data.success) {
        setComments(res.data.data);
      }
    } catch (error) {
      console.error("Load comments error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  }, [videoId, token]);

  useEffect(() => {
    if (visible) {
      loadComments();
    } else {
      setComments([]);
      setNewComment("");
      setReplyingTo(null);
      setExpandedReplies({});
    }
  }, [visible, loadComments]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSendComment = async () => {
    const text = newComment.trim();
    if (!text || sending || !token) return;

    setSending(true);
    try {
      const payload = {
        videoId,
        text,
        parentId: replyingTo?.id || null,
      };

      const res = await api.post("/comments", payload);

      if (res.data.success) {
        const newComm = res.data.data;

        if (replyingTo) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === replyingTo.id
                ? { ...c, replies: [...(c.replies || []), newComm] }
                : c
            )
          );
          // Auto expand replies
          setExpandedReplies(prev => ({ ...prev, [replyingTo.id]: true }));
        } else {
          setComments((prev) => [newComm, ...prev]);
        }

        setNewComment("");
        setReplyingTo(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Send comment error:", error.response?.data || error.message);
      alert("Failed to post comment. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleToggleLike = async (commentId) => {
    if (!token) return;
    try {
      const res = await api.post(`/comments/${commentId}/toggle-like`);

      if (res.data.success) {
        const { likes, action } = res.data.data;

        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, likes, isLikedByUser: action === "liked" };
            }
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId
                    ? { ...r, likes, isLikedByUser: action === "liked" }
                    : r
                ),
              };
            }
            return c;
          })
        );

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Like error:", error);
    }
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const canReply = (commentUserId) => commentUserId !== userId;

  const renderReply = (reply) => (
    <View key={reply.id} style={styles.replyItem}>
      <Text style={styles.replyAvatar}>👤</Text>
      <View style={styles.replyContent}>
        <View style={styles.replyHeader}>
          <Text style={styles.replyUser}>{reply.userName}</Text>
          <Text style={styles.replyTime}>
            {new Date(reply.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <Text style={styles.replyText}>{reply.text}</Text>

        <View style={styles.replyActions}>
          <TouchableOpacity
            style={styles.replyAction}
            onPress={() => handleToggleLike(reply.id)}
          >
            <Feather
              name="thumbs-up"
              size={14}
              color={reply.isLikedByUser ? colors.primary : colors.textLight}
            />
            <Text
              style={[
                styles.replyActionText,
                reply.isLikedByUser && { color: colors.primary, fontWeight: "700" },
              ]}
            >
              {reply.likes || 0}
            </Text>
          </TouchableOpacity>

          {canReply(reply.userId) && (
            <TouchableOpacity
              style={styles.replyAction}
              onPress={() => {
                setReplyingTo({ id: reply.parentId || reply.id, userName: reply.userName });
                setNewComment(`@${reply.userName} `);
              }}
            >
              <Feather name="corner-up-left" size={14} color={colors.textLight} />
              <Text style={styles.replyActionText}>Reply</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderComment = (item) => {
    const hasReplies = item.replies && item.replies.length > 0;
    const isExpanded = expandedReplies[item.id];

    return (
      <View style={styles.commentItem}>
        <Text style={styles.commentAvatar}>👤</Text>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUser}>{item.userName}</Text>
            <Text style={styles.commentTime}>
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>

          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.commentAction}
              onPress={() => handleToggleLike(item.id)}
            >
              <Feather
                name="thumbs-up"
                size={16}
                color={item.isLikedByUser ? colors.primary : colors.textLight}
              />
              <Text
                style={[
                  styles.commentActionText,
                  item.isLikedByUser && { color: colors.primary, fontWeight: "700" },
                ]}
              >
                {item.likes || 0}
              </Text>
            </TouchableOpacity>

            {canReply(item.userId) && (
              <TouchableOpacity
                style={styles.commentAction}
                onPress={() => {
                  setReplyingTo({ id: item.id, userName: item.userName });
                  setNewComment(`@${item.userName} `);
                }}
              >
                <Feather name="corner-up-left" size={16} color={colors.textLight} />
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* View Replies Button */}
          {hasReplies && (
            <TouchableOpacity
              style={styles.viewRepliesButton}
              onPress={() => toggleReplies(item.id)}
            >
              <View style={styles.replyLine} />
              <Feather 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={colors.primary} 
              />
              <Text style={styles.viewRepliesText}>
                {isExpanded ? "Hide" : "View"} {item.replies.length} {item.replies.length === 1 ? "reply" : "replies"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Replies List */}
          {hasReplies && isExpanded && (
            <View style={styles.repliesContainer}>
              {item.replies.map(renderReply)}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderItem = ({ item }) => renderComment(item);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />

        <View style={styles.panelWrapper}>
          <View style={styles.commentsPanel}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="chevron-down" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Loading or List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={[
                  styles.commentsContent,
                  { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 120 : 20 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            )}

            {/* Replying To Banner */}
            {replyingTo && (
              <View style={styles.replyingBanner}>
                <View style={styles.replyingInfo}>
                  <Feather name="corner-up-left" size={16} color={colors.primary} />
                  <Text style={styles.replyingText}>
                    Replying to <Text style={styles.replyingName}>@{replyingTo.userName}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                    setNewComment("");
                  }}
                  style={styles.cancelReply}
                >
                  <Feather name="x" size={18} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            )}

            {/* Input Box */}
            <View style={[
              styles.inputContainer,
              Platform.OS === 'android' && keyboardHeight > 0 && {
                marginBottom: keyboardHeight +40
              }
            ]}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                onSubmitEditing={handleSendComment}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newComment.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={handleSendComment}
                disabled={!newComment.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size={18} color="#fff" />
                ) : (
                  <Feather name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  panelWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.85,
  },
  keyboardView: {
    flex: 1,
  },
  commentsPanel: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  commentsContent: {
    padding: 16,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  commentAvatar: {
    fontSize: 36,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
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
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  commentActions: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 8,
  },
  commentAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  commentActionText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: "600",
  },
  viewRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  replyLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.primary + "40",
    borderRadius: 1,
  },
  viewRepliesText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  repliesContainer: {
    marginTop: 8,
  },
  replyItem: {
    flexDirection: "row",
    marginBottom: 12,
    paddingLeft: 12,
  },
  replyAvatar: {
    fontSize: 28,
    marginRight: 10,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 6,
  },
  replyUser: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  replyTime: {
    fontSize: 11,
    color: colors.textMuted,
  },
  replyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 8,
  },
  replyActions: {
    flexDirection: "row",
    gap: 16,
  },
  replyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  replyActionText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: "600",
  },
  replyingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary + "15",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  replyingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyingText: {
    fontSize: 14,
    color: colors.text,
  },
  replyingName: {
    fontWeight: "700",
    color: colors.primary,
  },
  cancelReply: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom:50,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
});