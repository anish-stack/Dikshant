import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Dimensions,
  StatusBar,
} from "react-native";
import Layout from "../../components/layout";
import axios from "axios";
import RazorpayCheckout from "react-native-razorpay";
import { LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const LoadingVideo = require("./quiz.mp4");
const PaymentSuccess = require("./payment_success.mp4");
const PaymentFailed = require("./payment_failed.mp4");

export default function QuizDetails({ route, navigation }) {
  const { quizId } = route.params || {};
  const { user, token } = useAuthStore();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed' | null
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  // Purchase status from API
  const [isPurchased, setIsPurchased] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [canAttempt, setCanAttempt] = useState(true);
  const [loadingPurchaseStatus, setLoadingPurchaseStatus] = useState(true);

  const loadingPlayer = useVideoPlayer(LoadingVideo, (player) => {
    player.loop = true;
    player.play();
  });

  const successPlayer = useVideoPlayer(PaymentSuccess, (player) => {
    player.loop = false;
  });

  const failedPlayer = useVideoPlayer(PaymentFailed, (player) => {
    player.loop = false;
  });

  useEffect(() => {
    if (!quizId) {
      Alert.alert("Error", "Invalid quiz");
      navigation.goBack();
      return;
    }
    fetchQuizAndPurchaseStatus();
  }, [quizId]);

  const fetchQuizAndPurchaseStatus = async () => {
    try {
      setLoading(true);

      const [quizRes] = await Promise.all([
        axios.get(`${LOCAL_ENDPOINT}/quiz/quizzes/${quizId}`),
        new Promise(resolve => setTimeout(resolve, 1000)) // min loading
      ]);

      const fetchedQuiz = quizRes.data.data;
      setQuiz(fetchedQuiz);

      // Now check purchase status
      await checkPurchaseStatus(fetchedQuiz);
    } catch (error) {
      Alert.alert("Error", "Failed to load quiz details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async (item) => {
    if (!token || item?.is_free || item.isFree) {
      setLoadingPurchaseStatus(false);
      setIsPurchased(item.isFree || item?.is_free || false);
      return;
    }

    try {
      setLoadingPurchaseStatus(true);
      const response = await axios.get(
        `${LOCAL_ENDPOINT}/orders/already-purchased`,
        {
          params: {
            type: "quiz",
            itemId: item?.id,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const {
        purchased = false,
        remainingAttempts = null,
        canAttempt = true,
      } = response.data || {};

      setIsPurchased(purchased);
      setRemainingAttempts(remainingAttempts);
      setCanAttempt(canAttempt);
    } catch (error) {
      console.error("Error checking purchase status:", error);
      setIsPurchased(false);
    } finally {
      setLoadingPurchaseStatus(false);
    }
  };

  const createOrderAndPay = async () => {
    if (paying || isPurchased || quiz.isFree || quiz?.is_free) return;

    try {
      setPaying(true);
      setPaymentStatus(null);

      const orderRes = await axios.post(
        `${LOCAL_ENDPOINT}/orders`,
        {
          userId: user.id,
          type: "quiz",
          itemId: quiz.id,
          amount: quiz.price,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorOrder, key } = orderRes.data.data || orderRes.data;

      const options = {
        key,
        amount: razorOrder.amount,
        currency: "INR",
        name: "Dikshant IAS",
        description: quiz.title,
        image: "https://dikshantiasnew-web.s3.amazonaws.com/logo.png",
        order_id: razorOrder.id,
        prefill: {
          email: user.email || "",
          contact: user.phone || "",
          name: user.name || "",
        },
        theme: { color: "#B11226" },
      };

      RazorpayCheckout.open(options)
        .then(async (data) => {
          await verifyPayment(data);
        })
        .catch((error) => {
          console.log("Razorpay cancelled:", error);
          setPaying(false);
          setPaymentStatus("failed");
          failedPlayer.play();
          setTimeout(() => setPaymentStatus(null), 4000);
        });
    } catch (error) {
      console.error("Payment init error:", error);
      setPaying(false);
      setPaymentStatus("failed");
      failedPlayer.play();
      Alert.alert("Payment Error", "Unable to initiate payment");
      setTimeout(() => setPaymentStatus(null), 4000);
    }
  };

  const verifyPayment = async (data) => {
    try {
      await axios.post(
        `${LOCAL_ENDPOINT}/orders/verify`,
        {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mark as purchased
      setIsPurchased(true);
      setPaying(false);
      setPaymentStatus("success");
      successPlayer.play();

      fetchQuizAndPurchaseStatus()
      setPaymentStatus(null);
      setTimeout(() => {
        setPaymentStatus(null);
      }, 3000);
    } catch (error) {
      console.error("Verification failed:", error);
      setPaying(false);
      setPaymentStatus("failed");
      failedPlayer.play();
      setTimeout(() => setPaymentStatus(null), 4000);
    }
  };

  const handleStartQuizPress = () => {
    if (paying) return;

    if (quiz.isFree || quiz?.is_free || isPurchased) {
      if (canAttempt) {
        setConfirmModalVisible(true);
      } else {
        Alert.alert("No Attempts Left", "You have used all your attempts for this quiz.");
      }
    } else {
      createOrderAndPay();
    }
  };

  const startQuiz = () => {
    setConfirmModalVisible(false);
    navigation.navigate("QuizPlay", { quizId: quiz.id });
  };

  if (loading || loadingPurchaseStatus || !quiz) {
    return (
      <View style={styles.fullScreenLoader}>
        <VideoView
          player={loadingPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Hero Section with Gradient Overlay */}
        <View style={styles.heroContainer}>
          <ImageBackground source={{ uri: quiz.image }} style={styles.heroImage}>
            <LinearGradient
              colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]}
              style={styles.gradientOverlay}
            >
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>

              <View style={styles.heroContent}>
                {!quiz.isFree || !quiz.is_free && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={16} color="#FCD34D" />
                    <Text style={styles.premiumText}>PREMIUM</Text>
                  </View>
                )}
                <Text style={styles.heroTitle}>{quiz.title}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Main Content Card */}
        <View style={styles.mainCard}>
          {/* Price Section */}
          {!quiz.isFree || !quiz.is_free && !isPurchased && (
            <View style={styles.priceSection}>
              <View>
                <Text style={styles.priceLabel}>Quiz Price</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceAmount}>₹{quiz.price}</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>30% OFF</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="help-circle-outline" size={18} color="#B11226" />
              <Text style={styles.statValue}>{quiz.totalQuestions}</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color="#B11226" />
              <Text style={styles.statValue}>{quiz.durationMinutes}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={18} color="#B11226" />
              <Text style={styles.statValue}>{quiz.totalMarks}</Text>
              <Text style={styles.statLabel}>Marks</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="repeat-outline" size={18} color="#B11226" />
              <Text style={styles.statValue}>
                {remainingAttempts !== null ? `${remainingAttempts}/${quiz.attemptLimit}` : quiz.attemptLimit}
              </Text>
              <Text style={styles.statLabel}>Attempts</Text>
            </View>
          </View>

          {/* What's Included */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#B11226" />
              <Text style={styles.sectionTitle}>What's Included</Text>
            </View>
            <View style={styles.featuresList}>
              {quiz?.negativeMarking && (
                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: "#FEE2E2" }]}>
                    <MaterialIcons name="remove-circle-outline" size={20} color="#DC2626" />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Negative Marking</Text>
                    <Text style={styles.featureDesc}>
                      -{quiz.negativeMarksPerQuestion} marks per wrong answer
                    </Text>
                  </View>
                </View>
              )}

              {quiz.showHints && (
                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: "#D1FAE5" }]}>
                    <Ionicons name="bulb" size={20} color="#059669" />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Smart Hints</Text>
                    <Text style={styles.featureDesc}>
                      Get helpful hints for difficult questions
                    </Text>
                  </View>
                </View>
              )}

              {quiz.showExplanations && (
                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="document-text" size={20} color="#2563EB" />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Detailed Explanations</Text>
                    <Text style={styles.featureDesc}>
                      Comprehensive solutions for every question
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="shuffle" size={20} color="#7C3AED" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Randomized Questions</Text>
                  <Text style={styles.featureDesc}>
                    Questions appear in random order each time
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="analytics" size={20} color="#F59E0B" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Performance Analytics</Text>
                  <Text style={styles.featureDesc}>
                    Track your progress and improve
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={22} color="#B11226" />
              <Text style={styles.sectionTitle}>About This Quiz</Text>
            </View>
            <Text style={styles.description}>{quiz.description}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating CTA Button */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            (quiz.isFree || quiz.is_free || isPurchased) ? styles.freeButton : styles.premiumButton,
          ]}
          onPress={handleStartQuizPress}
          disabled={paying || (!canAttempt && isPurchased)}
          activeOpacity={0.8}
        >
          {paying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.ctaContent}>
              <Ionicons
                name={(quiz.isFree || quiz.is_free || isPurchased) ? "play-circle" : "cart"}
                size={24}
                color="#FFF"
              />
              <Text style={styles.ctaText}>
                {quiz.isFree || quiz.is_free
                  ? "Start Quiz Free"
                  : isPurchased
                    ? (canAttempt ? "Start Quiz" : "No Attempts Left")
                    : `Enroll Now • ₹${quiz.price}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Payment Feedback */}
      {paymentStatus && (
        <View style={styles.feedbackOverlay}>
          <View style={styles.feedbackContainer}>
            <VideoView
              player={paymentStatus === "success" ? successPlayer : failedPlayer}
              style={styles.feedbackVideo}
              contentFit="contain"
              nativeControls={false}
            />
            <Text style={styles.feedbackText}>
              {paymentStatus === "success" ? "Payment Successful! 🎉" : "Payment Failed 😔"}
            </Text>
            {paymentStatus === "success" && (
              <Text style={styles.redirectText}>Redirecting to quiz...</Text>
            )}
          </View>
        </View>
      )}

      {/* Confirm Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="help-circle" size={64} color="#B11226" />
            <Text style={styles.modalTitle}>Start Quiz?</Text>
            <Text style={styles.modalMessage}>{quiz.title}</Text>
            <Text style={styles.modalDetails}>
              • {quiz.totalQuestions} Questions • {quiz.durationMinutes} Minutes
              {'\n'}
              {quiz.negativeMarking && `• Negative Marking: -${quiz.negativeMarksPerQuestion} per wrong answer`}
              {remainingAttempts !== null && `\n• Attempts Remaining: ${remainingAttempts}`}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={startQuiz}
              >
                <Text style={styles.confirmText}>Start Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// All your original styles remain exactly the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  fullScreenLoader: {
    flex: 1,
    backgroundColor: "#fff",
  },
  fullScreenVideo: {
    width: width,
    height: height,
  },
  heroContainer: {
    height: 420,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 40,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 30,
    marginBottom: 10,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(252, 211, 77, 0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FCD34D",
    marginBottom: 12,
  },
  premiumText: {
    color: "#FCD34D",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 16,
    lineHeight: 38,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    color: "#E5E7EB",
    fontSize: 14,
    marginLeft: 6,
    fontWeight: "500",
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#9CA3AF",
    marginHorizontal: 12,
  },
  mainCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  priceLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: "900",
    color: "#B11226",
    marginRight: 12,
  },
  discountBadge: {
    backgroundColor: "#22C55E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 8,
  },
  description: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginLeft: 8,
    marginRight: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  featureContent: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  floatingButtonContainer: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  ctaButton: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  freeButton: {
    backgroundColor: "#111827",
  },
  premiumButton: {
    backgroundColor: "#B11226",
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 10,
  },
  feedbackOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  feedbackContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    maxWidth: 340,
  },
  feedbackVideo: {
    width: 280,
    height: 280,
    borderRadius: 20,
    marginBottom: 20,
  },
  feedbackText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    width: width * 0.85,
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    marginBottom: 12,
  },
  modalDetails: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  confirmButton: {
    backgroundColor: "#B11226",
  },
  cancelText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
  },
  confirmText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  redirectText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
});