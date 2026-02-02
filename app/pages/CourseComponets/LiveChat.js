import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { colors } from "../../constant/color";
import { useSocket } from "../../context/SocketContext";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/auth.store";

const BOTTOM_GESTURE_THRESHOLD = 16;
const API_BASE = API_URL_LOCAL_ENDPOINT;

export default function LiveChat({ videoId, userId, visible, onClose, onLiveCountChange }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [liveCount, setLiveCount] = useState(0);
  const { user } = useAuthStore();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef(null);
  const { socket } = useSocket();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const isGestureNavigation = insets.bottom >= BOTTOM_GESTURE_THRESHOLD;
  const TAB_BAR_HEIGHT = isGestureNavigation ? 12 : 56;

  // Animation
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 25,
        stiffness: 100,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [800, 0],
  });

  // Keyboard handling
  useEffect(() => {
    const showListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        scrollToBottom();
      }
    );

    const hideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const addMessage = (msg) => {
    const normalized = {
      id: msg.id || msg._id,
      userId: msg.userId?.toString(),
      userName: msg.userName || "Unknown User",
      message: msg.message || "",
      timestamp: msg.timestamp || msg.createdAt || new Date(),
      type: msg.messageType || "message",
    };

    setMessages((prev) => {
      // Check if message already exists by ID
      const existsById = prev.some((m) => m.id === normalized.id);
      if (existsById) return prev;

      // Add the new message and sort by timestamp
      const updated = [...prev, normalized].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      return updated;
    });
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/chat/history/${videoId}?limit=500`);
      if (res.data.success && Array.isArray(res.data.data)) {
        // Reset messages and add all from API (including join/leave)
        setMessages([]);
        res.data.data.forEach(addMessage);
        setTimeout(() => scrollToBottom(false), 200);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error.message);
    }
  };

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 150);
  };

  // Initial load + Socket setup
  useEffect(() => {
    if (!visible || !videoId || !userId) return;

    // Load history on open
    fetchChatHistory();

    if (!socket) return;

    socket.emit("join-chat", { videoId, userId });

    const handleNewMessage = (data) => {
      console.log("New socket message:", data);
      addMessage(data);
      scrollToBottom();
    };

    const handleTypingStart = (data) => {
      if (data.userId !== userId) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    };

    const handleAdminMessage = (data) => {
      console.log("Admin message:", data);
      addMessage(data);
      scrollToBottom();
    };

    const handleLiveCount = (data) => {
      const count = data.total || 0;
      setLiveCount(count);
      if (onLiveCountChange) {
        onLiveCountChange(count);
      }
    };

    socket.on("chat-message", handleNewMessage);
    socket.on("user-typing", handleTypingStart);
    socket.on("admin-message", handleAdminMessage);
    socket.on("live-watching-count", handleLiveCount);

    return () => {
      socket.off("chat-message", handleNewMessage);
      socket.off("user-typing", handleTypingStart);
      socket.off("admin-message", handleAdminMessage);
      socket.off("live-watching-count", handleLiveCount);
      socket.emit("leave-chat", { videoId, userId });
    };
  }, [socket, visible, videoId, userId]);

  // Periodic refresh removed - rely on socket events
  // If you still need periodic refresh, uncomment below but it's not recommended
  /*
  */
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      fetchChatHistory();
    }, 10000); // Reduced to 10 seconds
    return () => clearInterval(interval);
  }, [visible]);

  const sendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !socket) return;

    const messageData = {
      videoId,
      userId: userId.toString(),
      userName: user?.name || "Student",
      message: trimmed,
      messageType: "message",
      timestamp: new Date(),
    };

    socket.emit("send-chat-message", messageData);

    // Add optimistic message
    addMessage({
      ...messageData,
      id: `temp-${Date.now()}`,
    });

    setNewMessage("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollToBottom();
  };

  const handleTyping = () => {
    if (socket && newMessage.trim()) {
      socket.emit("typing", { videoId, userId });
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.userId === userId.toString();
    const isSystemMessage = ["join", "leave"].includes(item.type);

    // System messages (join/leave) - centered style
    if (isSystemMessage) {
      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessageBubble}>
            <Text style={styles.systemMessageText}>{item.message}</Text>
            <Text style={styles.systemMessageTime}>{formatTime(item.timestamp)}</Text>
          </View>
        </View>
      );
    }

    // Regular chat messages
    return (
      <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
        <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
          {!isOwn && <Text style={styles.userName}>{item.userName}</Text>}
          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isOwn && styles.ownMessageTime]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose} accessible={false}>
        <View
          style={styles.backdrop}
          pointerEvents="box-only"
          onStartShouldSetResponder={() => true}
          onResponderRelease={onClose}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.bottomSheet,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
          {/* Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Live Chat</Text>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>{liveCount} watching</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="chevron-down" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToBottom(false)}
            keyboardShouldPersistTaps="always"
          />

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Someone is typing...</Text>
            </View>
          )}

          {/* Input Container */}
          <View
            style={[
              styles.inputContainer,
              {
                marginBottom: TAB_BAR_HEIGHT + (isGestureNavigation ? insets.bottom : 0),
              },
            ]}
          >
            <TextInput
              style={styles.messageInput}
              value={newMessage}
              onChangeText={(text) => {
                setNewMessage(text);
                handleTyping();
              }}
              onSubmitEditing={sendMessage}
              placeholder="Send a message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              activeOpacity={0.7}
            >
              <Feather name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "85%",
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 30,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  liveBadgeText: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: "600",
  },
  closeButton: {
    padding: 6,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 10,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: "#e11d48",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  userName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textLight,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  ownMessageText: {
    color: "#fff",
  },
  messageTime: {
    fontSize: 11,
    marginTop: 5,
    color: colors.textLight,
    opacity: 0.7,
    alignSelf: "flex-end",
  },
  ownMessageTime: {
    color: "#fff",
  },
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 8,
  },
  systemMessageBubble: {
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    maxWidth: "70%",
  },
  systemMessageText: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: "center",
  },
  systemMessageTime: {
    fontSize: 10,
    color: colors.textLight,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 2,
  },
  typingIndicator: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
    color: colors.textLight,
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    backgroundColor: "#e11d48",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#999",
  },
});