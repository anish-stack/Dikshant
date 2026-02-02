import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from '../../stores/auth.store';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher"

const { width } = Dimensions.get('window');

export default function ResultScreen({ route, navigation }) {
  const { submissionId } = route.params;
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadingTitle, setDownloadingTitle] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const token = useAuthStore((state) => state.accessToken);

  const fetchResult = async () => {
    try {
      const res = await axios.get(
        `${LOCAL_ENDPOINT}/testseriess/submission-one/${submissionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        const data = res.data.data;
        const parsedUrls = Array.isArray(data.answerSheetUrls)
          ? data.answerSheetUrls
          : data.answerSheetUrls
          ? JSON.parse(data.answerSheetUrls)
          : [];

        setSubmission({
          ...data,
          answerSheetUrls: parsedUrls,
        });
      } else {
        Alert.alert("Error", "Failed to load result");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Error loading result. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (submissionId) fetchResult();
  }, [submissionId]);

  useEffect(() => {
    if (submission) {
      navigation.setOptions({
        title: submission.TestSery?.title || "Result",
        headerLeft: () => (
          <TouchableOpacity
            style={styles.headerLeft}
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate('Home'); // Adjust 'Home' to your actual home screen name
            }}
          >
            <Ionicons name="home-outline" size={24} color="#4f46e5" />
            <Text style={styles.headerLeftText}>Home</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity
            style={styles.headerRight}
            onPress={() => {
              Haptics.selectionAsync();
              onRefresh();
            }}
          >
            <Ionicons name="refresh" size={24} color="#4f46e5" />
          </TouchableOpacity>
        ),
      });
    }
  }, [submission, navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    Haptics.selectionAsync();
    fetchResult();
  };

  const showAlert = (title, message) => {
    Alert.alert(title, message);
  };

  const openPDF = async (url) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot open", "This PDF cannot be opened on your device.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open PDF.");
    }
  };

  const downloadPdf = async (url, title) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await openDownloadedPdf(fileUri);
        return;
      }

      setDownloadingTitle(title);
      setDownloadProgress(0);
      setDownloadModalVisible(true);

      const callback = (progress) => {
        const percentage = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
        setDownloadProgress(Math.round(percentage * 100));
      };

      const downloadResumable = FileSystem.createDownloadResumable(url, fileUri, {}, callback);
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
      if (Platform.OS === 'android') {
        contentUri = await FileSystem.getContentUriAsync(fileUri);
      }

      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contentUri,
        type: "application/pdf",
        flags: 1,
      });
    } catch (error) {
      console.error("Error opening PDF:", error);
      showAlert("Saved", `PDF saved at:\n${fileUri}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading your result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!submission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Result not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scorePercentage = submission.totalMarks
    ? ((submission.marksObtained / submission.totalMarks) * 100).toFixed(1)
    : 0;

  const isHighScore = parseFloat(scorePercentage) >= 70;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Download Progress Modal */}
      <Modal visible={downloadModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Downloading {downloadingTitle}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{downloadProgress}%</Text>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Score Highlight Card */}
        <View style={[styles.scoreCard, isHighScore && styles.highScoreCard]}>
          <Text style={styles.scoreLabel}>Your Score</Text>
          <Text style={styles.scoreMain}>
            {submission.marksObtained} <Text style={styles.scoreTotal}>/ {submission.totalMarks}</Text>
          </Text>
          <Text style={styles.percentage}>{scorePercentage}%</Text>
          <View style={styles.resultBadge}>
            <Ionicons name="trophy" size={28} color="#fbbf24" />
            <Text style={styles.resultBadgeText}>Result Published</Text>
          </View>
        </View>

        {/* Student Info */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Student Details</Text>
          <View style={styles.infoRow}>
            <Feather name="user" size={20} color="#6366f1" />
            <Text style={styles.infoText}>{submission.User?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="mail" size={20} color="#6366f1" />
            <Text style={styles.infoText}>{submission.User?.email || 'N/A'}</Text>
          </View>
        </View>

        {/* Submitted Answer Sheets */}
        {submission.answerSheetUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Submitted Answer Sheets</Text>
            {submission.answerSheetUrls.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={styles.pdfCard}
                onPress={() => openPDF(url)}
                onLongPress={() => downloadPdf(url, `submitted_sheet_${index + 1}`)}
              >
                <Ionicons name="document-text" size={32} color="#dc2626" />
                <View style={styles.pdfInfo}>
                  <Text style={styles.pdfTitle}>Answer Sheet {index + 1}</Text>
                  <Text style={styles.pdfSubtitle}>Tap to view • Long press to download</Text>
                </View>
                <Ionicons name="open-outline" size={24} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Checked Answer Sheet */}
        {submission.answerCheckedUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Checked Answer Sheet</Text>
            <TouchableOpacity
              style={[styles.pdfCard, styles.checkedPdfCard]}
              onPress={() => openPDF(submission.answerCheckedUrl)}
              onLongPress={() => downloadPdf(submission.answerCheckedUrl, "checked_answer_sheet")}
            >
              <Ionicons name="checkbox" size={32} color="#16a34a" />
              <View style={styles.pdfInfo}>
                <Text style={styles.pdfTitle}>Evaluated Copy</Text>
                <Text style={styles.pdfSubtitle}>Reviewed by evaluator • Tap to view</Text>
              </View>
              <Ionicons name="download-outline" size={24} color="#16a34a" />
            </TouchableOpacity>
          </View>
        )}

        {/* Review Feedback */}
        {submission.reviewStatus && submission.reviewStatus !== 'pending' && (
          <View style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>Evaluator Feedback</Text>
            <View style={styles.statusBadge}>
              <Text style={[
                styles.statusText,
                submission.reviewStatus === 'approved' && styles.approvedText,
                submission.reviewStatus === 'rejected' && styles.rejectedText,
              ]}>
                {submission.reviewStatus.charAt(0).toUpperCase() + submission.reviewStatus.slice(1)}
              </Text>
            </View>
            {submission.reviewComment ? (
              <Text style={styles.commentText}>"{submission.reviewComment}"</Text>
            ) : (
              <Text style={styles.noComment}>No additional comments provided.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', marginLeft: 16 },
  headerLeftText: { marginLeft: 8, color: '#4f46e5', fontWeight: '600' },
  headerRight: { marginRight: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 16, fontSize: 18, color: '#ef4444', fontWeight: '600' },

  // Score Card
  scoreCard: {
    backgroundColor: '#4f46e5',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  highScoreCard: { backgroundColor: '#16a34a' },
  scoreLabel: { color: '#e0e7ff', fontSize: 17, marginBottom: 8, fontWeight: '500' },
  scoreMain: { color: '#fff', fontSize: 56, fontWeight: '800' },
  scoreTotal: { fontSize: 36, fontWeight: '600', opacity: 0.8 },
  percentage: { color: '#c7d2fe', fontSize: 28, fontWeight: '700', marginTop: 6 },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    marginTop: 20,
  },
  resultBadgeText: { color: '#fff', marginLeft: 10, fontSize: 16, fontWeight: '700' },

  // Cards
  infoCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  section: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 20, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  infoText: { marginLeft: 14, fontSize: 16, color: '#475569' },

  // PDF Cards
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkedPdfCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  pdfInfo: { flex: 1, marginLeft: 16 },
  pdfTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  pdfSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },

  // Review Card
  reviewCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 30, backgroundColor: '#fef3c7' },
  statusText: { fontWeight: 'bold', fontSize: 15, color: '#d97706' },
  approvedText: { color: '#16a34a' },
  rejectedText: { color: '#dc2626' },
  commentText: { fontSize: 16, color: '#374151', fontStyle: 'italic', lineHeight: 26, marginTop: 12 },
  noComment: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 28, borderRadius: 20, width: width * 0.8, alignItems: 'center' },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  progressBar: { height: 10, width: '100%', backgroundColor: '#e2e8f0', borderRadius: 5, overflow: 'hidden', marginVertical: 12 },
  progressFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 5 },
  progressText: { fontSize: 16, fontWeight: '600', color: '#4f46e5' },
});