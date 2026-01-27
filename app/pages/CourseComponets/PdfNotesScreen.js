// screens/PdfNotesScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Platform,
  Share,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { API_URL_LOCAL_ENDPOINT } from '../../constant/api';

const BASE_URL = API_URL_LOCAL_ENDPOINT;

export default function PdfNotesScreen({ route, navigation }) {
  const { videoId, videoTitle } = route.params;

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null); // null = All
  const [pdfs, setPdfs] = useState([]);
  const [filteredPdfs, setFilteredPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingTitle, setDownloadingTitle] = useState('');

  // Fetch Categories
  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/pdfnotes/pdf-category`);
      if (res.data.success) {
        const cats = [{ id: null, name: 'All' }, ...res.data.data];
        setCategories(cats);
        setSelectedCategory(null); // Default to All
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Fetch All PDFs for this video
  const fetchPdfNotes = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/pdfnotes`, {
        params: { videoId },
      });

      if (res.data.success) {
        setPdfs(res.data.data || []);
        setFilteredPdfs(res.data.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchPdfNotes();
  }, []);

  // Filter PDFs when category changes
  useEffect(() => {
    if (selectedCategory === null) {
      setFilteredPdfs(pdfs);
    } else {
      setFilteredPdfs(pdfs.filter(pdf => pdf.pdfCategory === selectedCategory));
    }
  }, [selectedCategory, pdfs]);

  const openPdf = (url) => {
    Linking.openURL(url).catch(() =>
      alert('Cannot open online. Try downloading.')
    );
  };

  const downloadPdf = async (url, title) => {
    try {
      const fileName = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
      const fileUri = FileSystem.documentDirectory + fileName;

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (fileInfo.exists) {
        await openDownloadedPdf(fileUri);
        return;
      }

      // Show custom download modal
      setDownloadingTitle(title);
      setDownloadProgress(0);
      setDownloadModalVisible(true);

      const callback = (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
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

      if (!uri) throw new Error('Download failed');

      alert('Downloaded ✓');
      await openDownloadedPdf(uri);
    } catch (error) {
      setDownloadModalVisible(false);
      console.error(error);
      alert('Download failed. Please try again.');
    }
  };

  const openDownloadedPdf = async (fileUri) => {
    try {
      let contentUri = fileUri;
      if (Platform.OS === 'android') {
        contentUri = await FileSystem.getContentUriAsync(fileUri);
      }

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/pdf',
        flags: 1,
      });
    } catch (error) {
      try {
        await Share.share({ url: fileUri, title: 'Open PDF' });
      } catch (shareError) {
        alert(`PDF saved at:\n${fileUri}`);
      }
    }
  };

  const renderPdfItem = ({ item }) => (
    <View style={styles.pdfCard}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="file-pdf-box" size={56} color="#dc2626" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.categoryBadge}>
          {categories.find(c => c.id === item.pdfCategory)?.name || 'Notes'}
        </Text>
        <Text style={styles.date}>
          Added on {new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.viewBtn]} onPress={() => openPdf(item.fileUrl)}>
            <MaterialCommunityIcons name="eye-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={() => downloadPdf(item.fileUrl, item.title)}>
            <MaterialCommunityIcons name="download-outline" size={18} color="#fff" />
            <Text style={styles.btnText}>Download</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.fullLoading}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading notes & categories...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#1f2937" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerMainTitle}>PDF Notes</Text>
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {videoTitle}
          </Text>
        </View>
      </View>

      {/* Category Tabs */}
   <View style={styles.tabsContainer}>
  {categories.map((cat) => (
    <TouchableOpacity
      key={cat.id || 'all'}
      style={[
        styles.tab,
        selectedCategory === cat.id && styles.activeTab,
      ]}
      onPress={() => setSelectedCategory(cat.id)}
    >
      <Text
        style={[
          styles.tabText,
          selectedCategory === cat.id && styles.activeTabText,
        ]}
      >
        {cat.name}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {/* PDF List */}
      <FlatList
        data={filteredPdfs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPdfItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={80} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No PDFs in this category</Text>
            <Text style={styles.emptySubtitle}>Check back later for updates.</Text>
          </View>
        }
      />

      {/* Custom Download Progress Modal */}
      <Modal visible={downloadModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.downloadModal}>
            <MaterialCommunityIcons name="cloud-download" size={60} color="#16a34a" />
            <Text style={styles.downloadTitle}>Downloading...</Text>
            <Text style={styles.downloadFileName} numberOfLines={2}>
              {downloadingTitle}
            </Text>

            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>

            <Text style={styles.progressText}>{downloadProgress}%</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  fullLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    elevation: 4,
  },
  backBtn: { padding: 8, marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerMainTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  headerSubtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  tabsContainer: {
    flexDirection:'row',
    flexWrap: "wrap",     
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
 
        marginBottom: 10,  

    paddingHorizontal: 13,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  activeTab: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  activeTabText: { color: '#ffffff' },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,
    left: '40%',
    width: 8,
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },

  listContainer: { padding: 16 },

  pdfCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 1,
  },
  iconContainer: { marginRight: 18, marginTop: 4 },
  content: { flex: 1 },
  title: { fontSize: 17, fontWeight: '600', color: '#111827', lineHeight: 24 },
  categoryBadge: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  date: { fontSize: 13, color: '#9ca3af', marginBottom: 14 },
  actions: { flexDirection: 'row', gap: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  viewBtn: { backgroundColor: '#3b82f6' },
  saveBtn: { backgroundColor: '#16a34a' },
  btnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#4b5563', marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },

  // Download Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadModal: {
    backgroundColor: '#ffffff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  downloadTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, color: '#111827' },
  downloadFileName: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  progressBar: {
    height: 10,
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#16a34a',
    borderRadius: 5,
  },
  progressText: { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#16a34a' },
});