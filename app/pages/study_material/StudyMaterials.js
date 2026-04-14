import React, { useEffect, useState } from "react"
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
  Dimensions,
} from "react-native"
import { useRoute, useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/MaterialCommunityIcons"
import * as FileSystem from "expo-file-system/legacy"
import * as IntentLauncher from "expo-intent-launcher"
import * as Sharing from "expo-sharing"
import api from "../../constant/fetcher"

const { width } = Dimensions.get("window")
const CARD_WIDTH = (width - 40) / 2

// ─── Fallback placeholder when coverImage is missing ───────────────────────
const PlaceholderCover = ({ categoryName }) => (
  <View style={styles.placeholderCover}>
    <Icon name="file-document-outline" size={36} color="#A5B4FC" />
    <Text style={styles.placeholderText} numberOfLines={1}>
      {categoryName || "Study Material"}
    </Text>
  </View>
)

// ─── Single material card ───────────────────────────────────────────────────
const MaterialCard = ({ item, onPreview, onDownload }) => {
  const isAlreadyPurchasedByUser = item.alreadyPurchased || false
  const isPaid = item.isPaid && parseFloat(item.price || 0) > 0
  const isDownloadable = item.isDownloadable !== false
  const hasImage = !!item.coverImage

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => onPreview(isAlreadyPurchasedByUser)} style={styles.card}>


      {/* Cover / Fallback */}
      {hasImage ? (
        <Image
          source={{ uri: item.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
          onError={() => { }}
        />
      ) : (
        <PlaceholderCover categoryName={item.category?.name} />
      )}

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.categoryText} numberOfLines={3}>
          {item.category?.name || "Material"}
        </Text>
        {!!item.shortDescription && (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.shortDescription}
          </Text>
        )}

        {/* Info chips */}
        <View style={styles.chipRow}>
          {item.isHardCopy ? (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Type</Text>
              <Text style={styles.chipValue}>Printed Copy</Text>
            </View>
          ) : (
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>Type</Text>
              <Text style={styles.chipValue}>PDF</Text>
            </View>
          )}

          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Price</Text>
            <Text style={[styles.chipValue, isPaid ? styles.paidText : styles.freeText]}>
              {isPaid ? `₹${item.price}` : "Free"}
            </Text>
          </View>

        </View>

        {/* Action buttons */}
        <View style={styles.btnRow}>

          <TouchableOpacity style={styles.previewBtn} onPress={() => onPreview(isAlreadyPurchasedByUser)}>
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>

          {isDownloadable && (
            <TouchableOpacity
              style={styles.downloadBtn}
              onPress={() => onDownload(item.fileUrl, item.title)}
            >
              <Text style={styles.downloadBtnText}>Download</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main screen ────────────────────────────────────────────────────────────
export default function StudyMaterials() {
  const route = useRoute()
  const navigation = useNavigation()
  const { slug } = route.params || {}

  const [materials, setMaterials] = useState([])
  const [filteredMaterials, setFilteredMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [categoryName, setCategoryName] = useState("Study Materials")

  const [downloadModalVisible, setDownloadModalVisible] = useState(false)
  const [downloadingTitle, setDownloadingTitle] = useState("")
  const [downloadProgress, setDownloadProgress] = useState(0)

  useEffect(() => {
    if (slug) fetchMaterials()
  }, [slug])

  const fetchMaterials = async () => {
    try {
      const res = await api.get(`/study-materials/materials-cat/${slug}`)
      const data = res.data.data || []
      setMaterials(data)
      setFilteredMaterials(data)
      if (data.length > 0 && data[0].category?.name) {
        setCategoryName(data[0].category.name)
      }
    } catch (err) {
      console.log("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = search.toLowerCase()
    setFilteredMaterials(
      materials.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.shortDescription && m.shortDescription.toLowerCase().includes(q))
      )
    )
  }, [search, materials])

  const openPdf = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Cannot Open", "Try downloading the file instead.")
    )
  }

  const downloadPdf = async (url, title) => {
    try {
      const fileName = title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".pdf"
      const fileUri = FileSystem.documentDirectory + fileName
      const info = await FileSystem.getInfoAsync(fileUri)

      if (info.exists) {
        await openDownloadedFile(fileUri)
        return
      }

      setDownloadingTitle(title)
      setDownloadProgress(0)
      setDownloadModalVisible(true)

      const dl = FileSystem.createDownloadResumable(url, fileUri, {}, (p) => {
        const pct = Math.round(
          (p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100
        )
        setDownloadProgress(isNaN(pct) ? 0 : pct)
      })

      const { uri } = await dl.downloadAsync()
      setDownloadModalVisible(false)
      if (!uri) throw new Error("No URI")
      Alert.alert("Downloaded", "File saved successfully!")
      await openDownloadedFile(uri)
    } catch {
      setDownloadModalVisible(false)
      Alert.alert("Failed", "Download failed. Check your connection.")
    }
  }

  const openDownloadedFile = async (fileUri) => {
    try {
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(fileUri)
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri,
          type: "application/pdf",
          flags: 1,
        })
      } else {
        await Sharing.shareAsync(fileUri)
      }
    } catch {
      try {
        await Sharing.shareAsync(fileUri)
      } catch {
        Alert.alert("Saved", `File path: ${fileUri}`)
      }
    }
  }

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{categoryName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Icon name="magnify" size={18} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search materials..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Icon name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Count */}
      <Text style={styles.countLabel}>
        {filteredMaterials.length} {filteredMaterials.length === 1 ? "result" : "results"}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading materials…</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F1F5F9" />

      <FlatList
        data={filteredMaterials}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <MaterialCard
            item={item}
            onPreview={(isAlreadyPurchasedByUser) => navigation.navigate("StudyMaterials-details", {
              slug: item.id,
              isAlreadyPurchasedByUser 
            })}
            onDownload={downloadPdf}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Icon name="file-search-outline" size={40} color="#A5B4FC" />
            </View>
            <Text style={styles.emptyTitle}>No materials found</Text>
            <Text style={styles.emptySub}>Try a different search term</Text>
          </View>
        }
      />

      {/* Download progress modal */}
      <Modal visible={downloadModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Icon name="download-circle-outline" size={36} color="#6366F1" />
            </View>
            <Text style={styles.modalTitle}>Downloading…</Text>
            <Text style={styles.modalFileName} numberOfLines={2}>
              {downloadingTitle}
            </Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
            </View>

            <Text style={styles.progressPct}>{downloadProgress}%</Text>
            <Text style={styles.modalNote}>Keep the app open during download</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F1F5F9" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },

  // List
  listContent: { paddingBottom: 32 },
  columnWrapper: { justifyContent: "space-between", paddingHorizontal: 16 },

  // Header
  listHeader: { backgroundColor: "#F1F5F9", paddingBottom: 4 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  topTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A", flex: 1, textAlign: "center" },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    height: 44,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    fontSize: 14,
    color: "#0F172A",
  },
  countLabel: { fontSize: 12, color: "#94A3B8", paddingHorizontal: 16, marginBottom: 10 },

  // Card
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 14,

  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },

  categoryText: { color: "#4338CA", fontSize: 10, fontWeight: "600" },
  priceBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  freeBadge: { backgroundColor: "#D1FAE5" },
  paidBadge: { backgroundColor: "#EEF2FF" },
  priceText: { fontSize: 10, fontWeight: "700", color: "#065F46" },
  paidText: { color: "#4338CA" },

  // Cover image / placeholder
  coverImage: { width: "100%", height: 110 },
  placeholderCover: {
    width: "100%",
    height: 110,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  placeholderText: {
    fontSize: 11,
    color: "#818CF8",
    fontWeight: "500",
    paddingHorizontal: 8,
    textAlign: "center",
  },

  // Body
  cardBody: { padding: 10 },
  cardTitle: { fontSize: 12.5, fontWeight: "700", color: "#0F172A", lineHeight: 17, marginBottom: 4 },
  cardDesc: { fontSize: 11, color: "#64748B", lineHeight: 15, marginBottom: 10 },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 },
  chip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    minWidth: "30%",
    flex: 1,
  },
  chipLabel: { fontSize: 9.5, color: "#94A3B8", marginBottom: 1 },
  chipValue: { fontSize: 11, fontWeight: "600", color: "#1E293B" },
  freeText: { color: "#059669" },
  noText: { color: "#EF4444" },

  // Buttons
  btnRow: { flexDirection: "row", gap: 6 },
  previewBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#6366F1",
    borderRadius: 8,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  previewBtnText: { color: "#6366F1", fontSize: 11, fontWeight: "600" },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#6366F1",
    borderRadius: 8,
    paddingVertical: 8,
  },
  downloadBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // Loading
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },

  // Empty state
  emptyWrap: { alignItems: "center", paddingVertical: 64, width: "100%" },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 4 },
  emptySub: { fontSize: 13, color: "#94A3B8" },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 320,
    padding: 24,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  modalFileName: { fontSize: 12.5, color: "#64748B", textAlign: "center", marginBottom: 20, lineHeight: 18 },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", backgroundColor: "#6366F1", borderRadius: 3 },
  progressPct: { fontSize: 14, fontWeight: "700", color: "#6366F1", marginBottom: 12 },
  modalNote: { fontSize: 11.5, color: "#94A3B8", textAlign: "center" },
})