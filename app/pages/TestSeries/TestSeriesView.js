import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import axios from "axios";
import RazorpayCheckout from "react-native-razorpay";
import { LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import LottieView from "lottie-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as DocumentPicker from "expo-document-picker";

const { width } = Dimensions.get("window");

export default function TestSeriesView({ route, navigation }) {
  const { id, isPurchased = false } = route.params || {};
  const { user, token } = useAuthStore();

  const [testSeries, setTestSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Download states
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadingTitle, setDownloadingTitle] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Upload states
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedAnswerFile, setSelectedAnswerFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Timer states
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilSubmissionStarts, setTimeUntilSubmissionStarts] = useState(null);
  const [timeUntilSubmissionEnds, setTimeUntilSubmissionEnds] = useState(null);
  const [canSubmit, setCanSubmit] = useState(false);

  useEffect(() => {
    if (!id) {
      showAlert("Error", "Invalid test series ID");
      navigation.goBack();
      return;
    }
    fetchTestSeries();
  }, [id]);

  useEffect(() => {
    // Update timer every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (testSeries && isPurchased) {
      calculateTimers();
    }
  }, [currentTime, testSeries, isPurchased]);

  const showAlert = (title, message) => {
    setCustomAlert({ visible: true, title, message });
  };

  const calculateTimers = () => {
    const now = currentTime.getTime();
    const submissionStart = new Date(testSeries.AnswerSubmitDateAndTime).getTime();
    const submissionEnd = new Date(testSeries.AnswerLastSubmitDateAndTime).getTime();

    if (now < submissionStart) {
      // Before submission window opens
      const diff = submissionStart - now;
      setTimeUntilSubmissionStarts(diff);
      setTimeUntilSubmissionEnds(null);
      setCanSubmit(false);
    } else if (now >= submissionStart && now < submissionEnd) {
      // Submission window is open
      const diff = submissionEnd - now;
      setTimeUntilSubmissionStarts(null);
      setTimeUntilSubmissionEnds(diff);
      setCanSubmit(true);
    } else {
      // After submission window closed
      setTimeUntilSubmissionStarts(null);
      setTimeUntilSubmissionEnds(null);
      setCanSubmit(false);
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const fetchTestSeries = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${LOCAL_ENDPOINT}/testseriess/user/${id}`);

      if (response.data) {
        setTestSeries(response.data.data);
      } else {
        showAlert("Not Found", "This test series is not available");
        navigation.goBack();
      }
    } catch (err) {
      showAlert("Network Error", "Please check your internet connection");
    } finally {
      setLoading(false);
    }
  };

  const createOrderAndPay = async () => {
    if (!testSeries) return;

    try {
      setPaying(true);
      setPaymentStatus(null);

      const orderRes = await axios.post(
        `${LOCAL_ENDPOINT}/orders`,
        {
          userId: user.id,
          type: "test",
          itemId: testSeries.id,
          amount: testSeries.discountPrice || testSeries.price,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorOrder, key } = orderRes.data.data || orderRes.data;

      const options = {
        key,
        amount: razorOrder.amount,
        currency: "INR",
        name: "Dikshant IAS",
        description: testSeries.title,
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
        .catch(() => {
          setPaying(false);
          setPaymentStatus("failed");
          setTimeout(() => setPaymentStatus(null), 4000);
        });
    } catch (error) {
      setPaying(false);
      setPaymentStatus("failed");
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

      setPaying(false);
      setPaymentStatus("success");
      setTimeout(() => {
        setPaymentStatus(null);
        navigation.replace("TestSeries");
      }, 3500);
    } catch (error) {
      setPaying(false);
      setPaymentStatus("failed");
      setTimeout(() => setPaymentStatus(null), 4000);
    }
  };

  const downloadPdf = async (url, title) => {
    try {
      const fileName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".pdf";
      const fileUri = FileSystem.documentDirectory + fileName;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await openDownloadedPdf(fileUri);
        return;
      }

      setDownloadingTitle(title);
      setDownloadProgress(0);
      setDownloadModalVisible(true);

      const callback = (downloadProgress) => {
        const progress =
          downloadProgress.totalBytesWritten /
          downloadProgress.totalBytesExpectedToWrite;
        setDownloadProgress(Math.round(progress * 100));
      };

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        fileUri,
        {},
        callback
      );

      const { uri } = await downloadResumable.downloadAsync();

      setDownloadModalVisible(false);

      if (!uri) throw new Error("Download failed");

      showAlert("Success", "PDF downloaded successfully!");
      await openDownloadedPdf(uri);
    } catch (error) {
      setDownloadModalVisible(false);
      console.error(error);
      showAlert("Error", "Download failed. Please try again.");
    }
  };

  const openDownloadedPdf = async (fileUri) => {
    try {
      let contentUri = fileUri;
      if (Platform.OS === "android") {
        contentUri = await FileSystem.getContentUriAsync(fileUri);
      }

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: "application/pdf",
        flags: 1,
      });
    } catch (error) {
      console.error("Error opening PDF:", error);
      showAlert("Info", `PDF saved at: ${fileUri}`);
    }
  };
  const pickAnswerSheet = async () => {
    try {
      console.log("📂 Opening document picker...");

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      console.log("📄 Document picker result:", result);

      // ✅ NEW API CHECK
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        console.log("✅ File selected:", {
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
          uri: file.uri,
        });

        // Validate file size (max 50MB)
        const maxSize = 50 * 1024 * 1024;
        if (file.size > maxSize) {
          console.warn("⚠️ File too large:", file.size);
          showAlert("Error", "File size must be less than 50MB");
          return;
        }

        setSelectedAnswerFile(file);
      } else {
        console.log("❌ File selection cancelled by user");
      }
    } catch (error) {
      console.error("🔥 Error picking file:", error);
      showAlert("Error", "Failed to select file");
    }
  };


  const uploadAnswerSheet = async () => {
    if (!selectedAnswerFile) {
      showAlert("Error", "Please select a file first");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("answerSheet", {
        uri: selectedAnswerFile.uri,
        type: "application/pdf",
        name: selectedAnswerFile.name,
      });
      formData.append("testSeriesId", testSeries.id);
      formData.append("userId", user.id);

      const response = await axios.post(
        `${LOCAL_ENDPOINT}/testseriess/${testSeries.id}/submit-answer`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(progress);
          },
        }
      );

      if (response.data.success) {
        setUploading(false);
        setUploadModalVisible(false);
        setSelectedAnswerFile(null);
        showAlert("Success", "Answer sheet uploaded successfully!");
      }
    } catch (error) {
      setUploading(false);
      console.error("Upload error:", error);
      showAlert(
        "Error",
        error.response?.data?.message || "Upload failed. Please try again."
      );
    }
  };

  const getPrice = () => {
    if (
      testSeries?.discountPrice &&
      testSeries.discountPrice < testSeries.price
    ) {
      return { actual: testSeries.discountPrice, original: testSeries.price };
    }
    return { actual: testSeries?.price, original: null };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#B11226" />
        <Text style={styles.loadingText}>Loading test series...</Text>
      </SafeAreaView>
    );
  }

  if (!testSeries) return null;

  const price = getPrice();
  const hasSubmitted = testSeries?.hasSubmitted || false;
  console.log(testSeries.resultGenerated)
  const hasResultAnnounced = Boolean(testSeries && testSeries.resultGenerated);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Header */}
        <View style={styles.hero}>
          <Image
            source={{ uri: testSeries.imageUrl }}
            style={styles.heroImage}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.9)"]}
            style={styles.heroGradient}
          />

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{testSeries.title}</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {testSeries.status?.toUpperCase() || "PREMIUM"}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Cards */}
        <View style={styles.contentContainer}>
          {/* Overview */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overview</Text>
            <Text style={styles.description}>{testSeries.description}</Text>
          </View>

          {/* Key Features */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Key Features</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>Full Length Mock Tests</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>
                  Detailed Performance Analysis
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>
                  Expert Evaluated Answers
                </Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>
                  Valid till{" "}
                  {new Date(testSeries.expirSeries).toLocaleDateString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          {/* Test Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>
                  {testSeries.timeDurationForTest} min
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="document-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>
                  {testSeries.type?.charAt(0).toUpperCase() +
                    testSeries.type?.slice(1)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="trophy-outline" size={20} color="#666" />
                <Text style={styles.detailLabel}>Passing Marks</Text>
                <Text style={styles.detailValue}>
                  {testSeries.passing_marks}
                </Text>
              </View>
            </View>
          </View>

          {/* Schedule & Timeline */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Schedule & Timeline</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Test Date</Text>
                  <Text style={styles.timelineValue}>
                    {new Date(testSeries.testStartDate).toLocaleDateString(
                      "en-IN",
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>Test Starts At</Text>
                  <Text style={styles.timelineValue}>
                    {new Date(testSeries.testStartTime).toLocaleString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>
                    Answer Submission Starts
                  </Text>
                  <Text style={styles.timelineValue}>
                    {new Date(
                      testSeries.AnswerSubmitDateAndTime
                    ).toLocaleString("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, { backgroundColor: "#ef4444" }]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineLabel}>
                    Last Submission Time
                  </Text>
                  <Text
                    style={[
                      styles.timelineValue,
                      { color: "#ef4444", fontWeight: "700" },
                    ]}
                  >
                    {new Date(
                      testSeries.AnswerLastSubmitDateAndTime
                    ).toLocaleString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                  <Text style={styles.timelineNote}>
                    ⏰ No submissions allowed after this
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Test Materials - Conditional Rendering */}
          {isPurchased ? (
            <View style={styles.card}>
              <View style={styles.materialsHeader}>
                <Ionicons name="folder-open" size={24} color="#B11226" />
                <Text style={styles.cardTitle}>Test Materials</Text>
              </View>

              {/* Question Paper */}
              {testSeries.questionPdf && (
                <TouchableOpacity
                  style={styles.materialCard}
                  onPress={() =>
                    downloadPdf(testSeries.questionPdf, "Question Paper")
                  }
                >
                  <View style={styles.materialIcon}>
                    <Ionicons name="document-text" size={28} color="#3b82f6" />
                  </View>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialTitle}>Question Paper</Text>
                    <Text style={styles.materialSubtitle}>
                      Tap to download and view
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={24} color="#666" />
                </TouchableOpacity>
              )}

              {/* Answer Key */}
              {testSeries.answerkey && (
                <TouchableOpacity
                  style={styles.materialCard}
                  onPress={() =>
                    downloadPdf(testSeries.answerkey, "Answer Key")
                  }
                >
                  <View
                    style={[styles.materialIcon, { backgroundColor: "#dcfce7" }]}
                  >
                    <Ionicons name="checkmark-done" size={28} color="#10b981" />
                  </View>
                  <View style={styles.materialInfo}>
                    <Text style={styles.materialTitle}>Answer Key</Text>
                    <Text style={styles.materialSubtitle}>
                      Tap to download and view
                    </Text>
                  </View>
                  <Ionicons name="download-outline" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.lockedCard}>
              <View style={styles.lockedHeader}>
                <Ionicons name="folder-open" size={24} color="#B11226" />
                <Text style={styles.lockedTitle}>Test Materials</Text>
              </View>
              <View style={styles.lockedContent}>
                <MaterialIcons name="lock" size={40} color="#ccc" />
                <Text style={styles.lockedText}>
                  Available after purchase
                </Text>
                <Text style={styles.lockedSubtext}>
                  Enroll to access question papers and answer keys
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {!isPurchased ? (
        /* ---------------- BUY BAR ---------------- */
        <LinearGradient colors={["#fff", "#f8fafc"]} style={styles.bottomBar}>
          <View style={styles.priceSection}>
            <View>
              {price.original && (
                <Text style={styles.strikePrice}>₹{price.original}</Text>
              )}
              <Text style={styles.mainPrice}>₹{price.actual}</Text>
              <Text style={styles.gstText}>+18% GST</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.enrollBtn, paying && { opacity: 0.8 }]}
            onPress={createOrderAndPay}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.enrollBtnText}>Enroll Now</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </LinearGradient>
      ) : (
        /* ---------------- SUBMISSION / RESULT BAR ---------------- */
        <View style={styles.uploadBar}>
          {/* RESULT ANNOUNCED - PRIORITY STATE */}
          {hasResultAnnounced ? (
            <View style={styles.resultContainer}>
              <View style={styles.resultAnnouncement}>
                <Ionicons name="trophy" size={28} color="#fbbf24" />
                <Text style={styles.resultAnnouncementText}>
                  Result has been announced!
                </Text>
              </View>

              <TouchableOpacity
                style={styles.viewScoreBtn}
                onPress={() => navigation.navigate("ResultScreen", { submissionId: testSeries?.subsmissionId || "" })}
              >
                <Ionicons name="trending-up" size={22} color="#fff" />
                <Text style={styles.viewScoreBtnText}>View Score</Text>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ALREADY SUBMITTED */}
              {hasSubmitted ? (
                <View style={styles.statusBadge}>
                  <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                  <Text style={styles.statusText}>You have already submitted your answers</Text>
                </View>
              ) : (
                <>
                  {/* BEFORE SUBMISSION STARTS */}
                  {timeUntilSubmissionStarts !== null && !canSubmit && (
                    <View style={styles.timerContainer}>
                      <Ionicons name="time-outline" size={20} color="#f59e0b" />
                      <View style={styles.timerInfo}>
                        <Text style={styles.timerLabel}>Submission starts in</Text>
                        <Text style={styles.timerValue}>{formatTime(timeUntilSubmissionStarts)}</Text>
                      </View>
                    </View>
                  )}

                  {/* SUBMISSION WINDOW OPEN */}
                  {timeUntilSubmissionEnds !== null && canSubmit && (
                    <View style={styles.timerContainer}>
                      <Ionicons name="timer-outline" size={20} color="#ef4444" />
                      <View style={styles.timerInfo}>
                        <Text style={styles.timerLabel}>Time remaining to submit</Text>
                        <Text style={[styles.timerValue, { color: "#ef4444" }]}>
                          {formatTime(timeUntilSubmissionEnds)}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* ACTION BUTTON - Only active when submission is allowed */}
              <TouchableOpacity
                style={[
                  styles.uploadBtn,
                  (!canSubmit || hasSubmitted) && styles.uploadBtnDisabled,
                ]}
                onPress={() => canSubmit && !hasSubmitted && setUploadModalVisible(true)}
                disabled={!canSubmit || hasSubmitted}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={22}
                  color={canSubmit && !hasSubmitted ? "#fff" : "#999"}
                />
                <Text
                  style={[
                    styles.uploadBtnText,
                    (!canSubmit || hasSubmitted) && { color: "#999" },
                  ]}
                >
                  {hasSubmitted
                    ? "Already Submitted"
                    : !canSubmit && timeUntilSubmissionStarts !== null
                      ? "Submission Not Started"
                      : !canSubmit
                        ? "Submission Closed"
                        : "Submit Your Answers"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}


      {/* Download Progress Modal */}
      {downloadModalVisible && (
        <Modal transparent visible={downloadModalVisible} animationType="fade">
          <View style={styles.overlay}>
            <View style={styles.progressModal}>
              <Ionicons name="download" size={50} color="#3b82f6" />
              <Text style={styles.progressTitle}>Downloading...</Text>
              <Text style={styles.progressSubtitle}>{downloadingTitle}</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${downloadProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercent}>{downloadProgress}%</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Upload Answer Sheet Modal */}
      {uploadModalVisible && (
        <Modal transparent visible={uploadModalVisible} animationType="slide">
          <View style={styles.overlay}>
            <View style={styles.uploadModal}>
              <View style={styles.uploadModalHeader}>
                <Text style={styles.uploadModalTitle}>Upload Answer Sheet</Text>
                <TouchableOpacity
                  onPress={() => !uploading && setUploadModalVisible(false)}
                  disabled={uploading}
                >
                  <Ionicons name="close" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Timer in Modal */}
              {timeUntilSubmissionEnds !== null && (
                <View style={styles.modalTimer}>
                  <Ionicons name="alarm-outline" size={20} color="#ef4444" />
                  <Text style={styles.modalTimerText}>
                    Time remaining: {formatTime(timeUntilSubmissionEnds)}
                  </Text>
                </View>
              )}

              {/* File Selection */}
              <TouchableOpacity
                style={styles.filePickerArea}
                onPress={pickAnswerSheet}
                disabled={uploading}
              >
                {selectedAnswerFile ? (
                  <>
                    <Ionicons
                      name="document-text"
                      size={50}
                      color="#10b981"
                    />
                    <Text style={styles.filePickerTitle}>
                      {selectedAnswerFile.name}
                    </Text>
                    <Text style={styles.filePickerSubtitle}>
                      {(selectedAnswerFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                    <Text style={styles.filePickerChange}>
                      Tap to change file
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={50}
                      color="#999"
                    />
                    <Text style={styles.filePickerTitle}>
                      Select PDF File
                    </Text>
                    <Text style={styles.filePickerSubtitle}>
                      Tap to choose your answer sheet (Max 50MB)
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Upload Progress */}
              {uploading && (
                <View style={styles.uploadProgressContainer}>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${uploadProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressPercent}>
                    Uploading... {uploadProgress}%
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.uploadModalActions}>
                <TouchableOpacity
                  style={styles.uploadModalCancelBtn}
                  onPress={() => setUploadModalVisible(false)}
                  disabled={uploading}
                >
                  <Text style={styles.uploadModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.uploadModalSubmitBtn,
                    (!selectedAnswerFile || uploading) &&
                    styles.uploadModalSubmitBtnDisabled,
                  ]}
                  onPress={uploadAnswerSheet}
                  disabled={!selectedAnswerFile || uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={20} color="#fff" />
                      <Text style={styles.uploadModalSubmitText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Payment Animation Modal */}
      {paymentStatus && (
        <View style={styles.overlay}>
          <View style={styles.animationBox}>
            <LottieView
              source={
                paymentStatus === "success"
                  ? require("../../assets/animations/success.json")
                  : require("../../assets/animations/failed.json")
              }
              autoPlay
              loop={false}
              style={{ width: 220, height: 220 }}
            />
            <Text style={styles.animTitle}>
              {paymentStatus === "success"
                ? "Enrolled Successfully!"
                : "Payment Failed"}
            </Text>
            <Text style={styles.animMsg}>
              {paymentStatus === "success"
                ? "Welcome! You now have full access."
                : "Don't worry, no money was deducted."}
            </Text>
          </View>
        </View>
      )}

      {/* Custom Alert Modal */}
      {customAlert.visible && (
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <Ionicons
              name={
                customAlert.title === "Success"
                  ? "checkmark-circle"
                  : "alert-circle"
              }
              size={50}
              color={customAlert.title === "Success" ? "#10b981" : "#ef4444"}
            />
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.alertBtn}
              onPress={() =>
                setCustomAlert({ visible: false, title: "", message: "" })
              }
            >
              <Text style={styles.alertBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#666" },

  hero: { height: width * 0.75, position: "relative" },
  heroImage: { width: "100%", height: "100%", resizeMode: "cover" },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  backBtn: {
    position: "absolute",
    top: 10,
    left: 16,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 30,
  },
  heroContent: { position: "absolute", bottom: 24, left: 20, right: 20 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 8,
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#B11226",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  contentContainer: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111",
    marginBottom: 12,
  },
  description: { fontSize: 15.5, color: "#444", lineHeight: 24 },

  featureList: { gap: 12 },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 15, color: "#333" },

  detailsGrid: { flexDirection: "row", justifyContent: "space-around" },
  detailItem: { alignItems: "center" },
  detailLabel: { fontSize: 13, color: "#777", marginTop: 6 },
  detailValue: { fontSize: 16, fontWeight: "700", color: "#111", marginTop: 4 },

  timeline: { gap: 16 },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#B11226",
    marginTop: 6,
  },
  timelineContent: { flex: 1 },
  timelineLabel: { fontSize: 14, color: "#666", marginBottom: 4 },
  timelineValue: { fontSize: 16, fontWeight: "700", color: "#111" },
  timelineNote: {
    fontSize: 13,
    color: "#ef4444",
    marginTop: 4,
    fontStyle: "italic",
  },

  // Materials Section
  materialsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  materialCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  materialIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  materialInfo: { flex: 1 },
  materialTitle: { fontSize: 16, fontWeight: "700", color: "#111" },
  materialSubtitle: { fontSize: 13, color: "#666", marginTop: 2 },

  lockedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#fee2e2",
    borderStyle: "dashed",
  },
  lockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  lockedTitle: { fontSize: 18, fontWeight: "700", color: "#B11226" },
  lockedContent: { alignItems: "center", paddingVertical: 20 },
  lockedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginTop: 12,
  },
  lockedSubtext: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 6,
  },

  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 30,
    backgroundColor: "#fff",
  },
  priceSection: { flex: 1 },
  strikePrice: {
    fontSize: 18,
    color: "#999",
    textDecorationLine: "line-through",
  },
  mainPrice: { fontSize: 32, fontWeight: "900", color: "#B11226" },
  gstText: { fontSize: 13, color: "#777" },
  enrollBtn: {
    backgroundColor: "#B11226",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  enrollBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },

  // Upload Bar (for purchased users)
  uploadBar: {
    backgroundColor: "#fff",
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  timerInfo: { flex: 1 },
  timerLabel: { fontSize: 13, color: "#92400e", fontWeight: "600" },
  timerValue: { fontSize: 18, fontWeight: "800", color: "#f59e0b", marginTop: 2 },
  uploadBtn: {
    backgroundColor: "#B11226",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  uploadBtnDisabled: {
    backgroundColor: "#e5e7eb",
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },

  // Modals
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  progressModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: width * 0.85,
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 16,
    color: "#111",
  },
  progressSubtitle: {
    fontSize: 15,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  progressBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginTop: 20,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3b82f6",
    marginTop: 12,
  },

  uploadModal: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    width: width * 0.9,
    maxHeight: width * 1.5,
  },
  uploadModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  uploadModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111",
  },
  modalTimer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  modalTimerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#dc2626",
  },
  filePickerArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    marginBottom: 20,
  },
  filePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginTop: 16,
    textAlign: "center",
  },
  filePickerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  filePickerChange: {
    fontSize: 13,
    color: "#3b82f6",
    marginTop: 8,
    fontWeight: "600",
  },
  uploadProgressContainer: {
    marginBottom: 20,
  },
  uploadModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  uploadModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  uploadModalCancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#666",
  },
  uploadModalSubmitBtn: {
    flex: 1,
    backgroundColor: "#B11226",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadModalSubmitBtnDisabled: {
    backgroundColor: "#d1d5db",
  },
  uploadModalSubmitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  animationBox: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: width * 0.9,
  },
  animTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginTop: 16,
    color: "#111",
  },
  animMsg: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
  },

  alertBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: width * 0.85,
  },
  alertTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginVertical: 16,
    color: "#111",
  },
  alertMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  alertBtn: {
    backgroundColor: "#B11226",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submittedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  submittedText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#166534",
  },
  resultContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultAnnouncement: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  resultAnnouncementText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#15803d",
    marginLeft: 12,
  },
  viewScoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  viewScoreBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginHorizontal: 10,
  },
  alertBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});