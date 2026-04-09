import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Linking,
  TextInput,
  StatusBar,
  Modal,
  Platform,
  Alert,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import api from "../../constant/fetcher";

export default function StudyMaterials() {
  const route = useRoute();
  const navigation = useNavigation();
  const { slug } = route.params || {};

  const [materials, setMaterials] = useState([]);
  const [filteredMaterials, setFilteredMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("Study Materials");

  // Download modal
  const [downloadModalVisible, setDownloadModalVisible] = useState(false);
  const [downloadingTitle, setDownloadingTitle] = useState("");
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (slug) fetchMaterials();
  }, [slug]);

  const fetchMaterials = async () => {
    try {
      const res = await api.get(`/study-materials/materials-cat/${slug}`);
      const data = res.data.data || [];
      setMaterials(data);
      setFilteredMaterials(data);
      if (data.length > 0 && data[0].category?.name) {
        setCategoryName(data[0].category.name);
      }
    } catch (error) {
      console.log("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  useEffect(() => {
    const filtered = materials.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredMaterials(filtered);
  }, [search, materials]);

  const openPdf = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Cannot Open", "Please try downloading the file instead.")
    );
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

      const callback = (progress) => {
        const percent = Math.round(
          (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        );
        setDownloadProgress(percent);
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

      Alert.alert("Success", "Downloaded successfully!");
      await openDownloadedPdf(uri);
    } catch (error) {
      setDownloadModalVisible(false);
      console.error(error);
      Alert.alert("Download Failed", "Please check your connection and try again.");
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
      try {
        await Sharing.shareAsync(fileUri);
      } catch {
        Alert.alert("PDF Saved", `Saved at: ${fileUri}`);
      }
    }
  };

  const renderMaterial = ({ item }) => {
    const isAlreadyPurchased = item?.alreadyPurchased || false;
    const isPaid = item.isPaid && parseFloat(item.price || 0) > 0;
    const hasCover = item.coverImage;

    return (
      <View style={styles.materialCard}>
        {/* Cover */}
        <View style={styles.coverContainer}>
          {hasCover ? (
            <Image
              source={{ uri: item.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Icon name="file-document-outline" size={52} color="#6366F1" />
            </View>
          )}

          {/* Badge */}
          {isPaid ? (
            <View style={styles.paidBadge}>
              <Icon name="lock" size={12} color="#fff" />
              <Text style={styles.badgeText}>₹{item.price}</Text>
            </View>
          ) : (
            <View style={[styles.paidBadge, styles.freeBadge]}>
              <Text style={styles.badgeText}>Free</Text>
            </View>
          )}
        </View>
        {isAlreadyPurchased && (
          <View style={styles.SubscribedBadge}>
            <Icon name="lock" size={12} color="#fff" />
            <Text style={styles.badgeText}>Subscribed</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.actions}>
            {/* Free OR Purchased */}
            {!isPaid || isAlreadyPurchased ? (
              <>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => openPdf(item.fileUrl)}
                >
                  <Icon name="eye-outline" size={18} color="#fff" />
                  <Text style={styles.viewBtnText}>View Online</Text>
                </TouchableOpacity>

                {item.isDownloadable && (
                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => downloadPdf(item.fileUrl, item.title)}
                  >
                    <Icon name="download-outline" size={18} color="#6366F1" />
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              /* Paid but not purchased */
              <TouchableOpacity
                style={styles.buyNowBtn}
                onPress={() =>
                  navigation.navigate("StudyMaterials-details", {
                    slug: item.id,
                  })
                }
              >
                <Icon name="cart-outline" size={20} color="#fff" />
                <Text style={styles.buyNowText}>Buy Now - ₹{item.price}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search materials..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94A3B8"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Icon name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.countText}>
        {filteredMaterials.length} materials found
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading materials...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <FlatList
        data={filteredMaterials}
        renderItem={renderMaterial}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={70} color="#E2E8F0" />
            <Text style={styles.emptyTitle}>No materials found</Text>
            <Text style={styles.emptySubtitle}>
              Try changing your search term
            </Text>
          </View>
        }
      />

      {/* Download Progress Modal */}
      <Modal visible={downloadModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Downloading</Text>
            <Text style={styles.modalFilename} numberOfLines={2}>
              {downloadingTitle}
            </Text>

            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, { width: `${downloadProgress}%` }]}
              />
            </View>

            <Text style={styles.progressText}>{downloadProgress}%</Text>

            <Text style={styles.modalNote}>
              Please keep the app open during download
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* Header & Search */
  listHeader: {
    backgroundColor: "#F8FAFC",
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 15,
    color: "#0F172A",
  },

  countText: {
    fontSize: 14,
    color: "#64748B",
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  /* Material Card */
  materialCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  coverContainer: {
    height: 160,
    backgroundColor: "#f1f5f9",
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  paidBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#6366F1",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  SubscribedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#29a836",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freeBadge: {
    backgroundColor: "#10B981",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 16.5,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    fontSize: 13.5,
    color: "#64748B",
    lineHeight: 19,
    marginBottom: 16,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
  },
  viewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  viewBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14.5,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#6366F1",
    gap: 8,
  },
  downloadBtnText: {
    color: "#6366F1",
    fontWeight: "600",
    fontSize: 14.5,
  },

  /* Loader */
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },

  /* Empty State */
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
  },
  /* Buy Now Button */
  buyNowBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",   // Green color for purchase (ya #6366F1 bhi rakh sakte ho)
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  buyNowText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15.5,
  },
  /* List */
  listContent: {
    paddingBottom: 30,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalFilename: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
  },
  progressContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6366F1",
  },
  progressText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6366F1",
    marginBottom: 16,
  },
  modalNote: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
  },
});