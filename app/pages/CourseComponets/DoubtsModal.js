import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native"
import { Feather } from "@expo/vector-icons"
import axios from "axios"
import * as Haptics from "expo-haptics"
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api"
import { useAuthStore } from "../../stores/auth.store"
import { colors } from "../../constant/color"

export default function DoubtsModal({
  visible,
  onClose,
  videoId,
  courseId,
  userId,
  currentTime
}) {
  const [subject, setSubject] = useState("")
  const [question, setQuestion] = useState("")
  const [attachmentUrl, setAttachmentUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [videoTimestamp, setVideoTimestamp] = useState(null)

  const { token } = useAuthStore()

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

  const handleCaptureTimestamp = () => {
    setVideoTimestamp(Math.floor(currentTime))
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  const handleSubmit = async () => {
    if (!question.trim()) {
      Alert.alert("Error", "Please enter subject and your doubt")
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        subject: subject.trim(),
        question: question.trim(),
        courseId: courseId || null,
        lessonId: videoId || null,
        attachmentUrl: attachmentUrl.trim() || null,
        videoTimestamp: videoTimestamp || Math.floor(currentTime)
      }

      const res = await axios.post(`${API_URL_LOCAL_ENDPOINT}/doubt`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })

      console.log("✅ Doubt Submitted:", res.data)

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert("Success", "Your doubt has been submitted successfully")

      // Reset form
      setSubject("")
      setQuestion("")
      setAttachmentUrl("")
      setVideoTimestamp(null)
      onClose()
    } catch (error) {
      console.error("❌ Ask Doubt Error:", error)
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to submit doubt"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalContainer}
      >
        <View style={styles.doubtContent}>
          <View style={styles.doubtHeader}>
            <Text style={styles.doubtTitle}>❓ Ask Your Doubt</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
    

            {/* Question Input */}
            <Text style={styles.inputLabel}>Your Doubt *</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Describe your doubt in detail..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
              value={question}
              onChangeText={setQuestion}
            />



            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather
                    name="send"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.submitButtonText}>Submit Doubt</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.doubtInfo}>
              ⚡ Your doubt will be answered by instructors within 24 hours
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)"
  },
  doubtContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 82,
    maxHeight: "85%",
    elevation: 8
  },
  doubtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  doubtTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text
  },
  timestampContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  timestampInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  timestampText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "700"
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
    borderColor: colors.primary
  },
  captureButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600"
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    marginTop: 8
  },
  subjectInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8
  },
  questionInput: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 16,
    fontSize: 14,
    color: colors.text,
    marginBottom: 16,
    textAlignVertical: "top",
    minHeight: 120
  },
  submitButton: {
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
    shadowRadius: 4
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  doubtInfo: {
    fontSize: 13,
    color: colors.textLight,
    textAlign: "center",
    lineHeight: 18
  }
})
