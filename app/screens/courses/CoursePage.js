import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import useSWR from "swr";
import axios from "axios";
import { fetcher } from "../../constant/fetcher";
import { useNavigation, useRoute } from "@react-navigation/native";
import Layout from "../../components/layout";
import { useAuthStore } from "../../stores/auth.store";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 36) / 2;

const LIMIT_OPTIONS = [10, 20, 50];

export default function CoursePage() {
  const navigation = useNavigation();
  const route = useRoute();
  const { filter } = route.params || {};
  const { token } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState(filter || "all");
  const [priceRange, setPriceRange] = useState("all");
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [purchaseStatus, setPurchaseStatus] = useState({}); // batchId → {purchased, canAccess, message?}
  const [checkingPurchases, setCheckingPurchases] = useState(false);

  const { data: response, error, isLoading } = useSWR(
    `/batchs?limit=${limit}&page=${page}`,
    fetcher
  );

  const batches = useMemo(() => response?.items || [], [response]);
  const totalPages = response?.pages || 1;

  // Fetch purchase + access status for visible batches
  const checkPurchaseAndAccess = async (batchIds) => {
    if (!token || batchIds.length === 0) return;

    setCheckingPurchases(true);
    const statusMap = { ...purchaseStatus };

    try {
      const promises = batchIds.map(async (batchId) => {
        try {
          const res = await axios.get(
            `${API_URL_LOCAL_ENDPOINT}/orders/already-purchased`,
            {
              params: { type: "batch", itemId: batchId },
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (res.data?.success) {
            statusMap[batchId] = {
              purchased: res.data.purchased || false,
              canAccess: res.data.canAccess ?? true,
              message: res.data.message || null,
            };
          }
        } catch (err) {
          console.warn(`Failed to check batch ${batchId}:`, err?.response?.data || err);
        }
      });

      await Promise.all(promises);
      setPurchaseStatus(statusMap);
    } catch (err) {
      console.error("Bulk purchase check failed:", err);
    } finally {
      setCheckingPurchases(false);
    }
  };

  useEffect(() => {
    if (batches.length > 0 && token) {
      const ids = batches.map((b) => b.id);
      checkPurchaseAndAccess(ids);
    }
  }, [batches, token]);

  const filteredBatches = useMemo(() => {
    let list = [...batches];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.name?.toLowerCase().includes(q) ||
          b.shortDescription?.toLowerCase().includes(q) ||
          b.program?.name?.toLowerCase().includes(q)
      );
    }

    if (selectedMode !== "all") {
      list = list.filter((b) => b.category === selectedMode);
    }

    if (priceRange !== "all") {
      list = list.filter((b) => {
        const p = b.batchDiscountPrice || b.batchPrice || 0;
        if (priceRange === "under20k") return p < 20000;
        if (priceRange === "20k-50k") return p >= 20000 && p <= 50000;
        if (priceRange === "above50k") return p > 50000;
        return true;
      });
    }

    return list;
  }, [batches, searchQuery, selectedMode, priceRange]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedMode("all");
    setPriceRange("all");
    setPage(1);
  };

  const hasFilters = searchQuery || selectedMode !== "all" || priceRange !== "all";

  const getFilterIcon = (cat) => {
    switch (cat) {
      case "online": return "wifi";
      case "offline": return "map-pin";
      case "recorded": return "video";
      default: return "grid";
    }
  };

  const handleCoursePress = (batch) => {
    const status = purchaseStatus[batch.id] || {};
    const { purchased, canAccess, message } = status;
    const isPurchased = !!status.purchased;
    if (purchased && canAccess) {
      // Go to classroom
      const screen = batch.category === "online" ? "my-course" : "my-course-subjects";
      navigation.navigate(screen, {
        unlocked: true,
        courseId: batch.id,
      });
    } else {
      // Go to detail / purchase flow
      navigation.navigate("CourseDetail", {
        courseId: batch.id,
        batchData: batch,
        isAlreadyPurchased: isPurchased,
        isExpired: isPurchased && !status.canAccess,
        expiryMessage: status.message || null,
      });
    }
  };

  const renderBatchCard = ({ item }) => {
    const price = item.batchDiscountPrice || item.batchPrice || 0;
    const original = item.batchDiscountPrice ? item.batchPrice : null;
    const discount = original ? Math.round(((original - price) / original) * 100) : 0;

    const status = purchaseStatus[item.id] || {};
    const isPurchased = status.purchased === true;
    const canAccess = status.canAccess !== false; // default true if missing
    const expired = isPurchased && !canAccess;

    return (
      <TouchableOpacity
        style={[styles.card, expired]}
        onPress={() => handleCoursePress(item)}
        activeOpacity={expired ? 1 : 0.8}
      // disabled={expired && isPurchased}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />

          {expired ? (
            <View style={styles.expiredBadge}>
              <Feather name="alert-triangle" size={12} color="#ffffff" />
              <Text style={styles.expiredText}>EXPIRED</Text>
            </View>
          ) : isPurchased ? (
            <View style={styles.subscribedBadge}>
              <Feather name="check-circle" size={10} color="#ffffff" />
              <Text style={styles.subscribedText}>SUBSCRIBED</Text>
            </View>
          ) : discount > 0 ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          ) : null}

          <View style={styles.categoryBadge}>
            <Feather name={getFilterIcon(item.category)} size={10} color="#ffffff" />
            <Text style={styles.categoryText}>
              {item.category === "recorded" ? "Recorded" : item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.programTag}>{item.program?.name || "—"}</Text>
          <Text style={styles.title} numberOfLines={2}>
            {item.name || "Untitled Course"}
          </Text>

          {expired ? (
            <Text style={styles.expiredMessage}>
              {status.message || "Access expired"}
            </Text>
          ) : isPurchased ? (
            <View style={styles.accessButtonSmall}>
              <Feather name="play-circle" size={12} color="#22c55e" />
              <Text style={styles.accessButtonTextSmall}>Go To Classroom</Text>
            </View>
          ) : (
            <View style={styles.priceRow}>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>₹{price.toLocaleString("en-IN")}</Text>
                {original && (
                  <Text style={styles.originalPrice}>₹{original.toLocaleString("en-IN")}</Text>
                )}
              </View>
              {item.isEmi && (
                <View style={styles.emiTag}>
                  <Text style={styles.emiText}>EMI</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Layout>
      <View style={styles.container}>
        {/* Header, Search, Filters, Results Header — unchanged */}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore Courses</Text>
          <Text style={styles.headerSubtitle}>
            {filteredBatches.length} courses available
          </Text>
        </View>

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses, programs..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Feather name="x" size={16} color="#9ca3af" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.filtersSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer}>
            {[
              { id: "all", label: "All", icon: "grid" },
              { id: "online", label: "Live", icon: "wifi" },
              { id: "offline", label: "Offline", icon: "map-pin" },
              { id: "recorded", label: "Recorded", icon: "video" },
            ].map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterTab, selectedMode === f.id && styles.filterTabActive]}
                onPress={() => setSelectedMode(f.id)}
              >
                <Feather name={f.icon} size={14} color={selectedMode === f.id ? "#fff" : "#6b7280"} />
                <Text style={[styles.filterTabText, selectedMode === f.id && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
            {hasFilters && (
              <TouchableOpacity style={styles.clearFilter} onPress={clearFilters}>
                <Feather name="x" size={14} color="#ef4444" />
                <Text style={styles.clearFilterText}>Clear</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{filteredBatches.length} results</Text>
          <View style={styles.limitSelector}>
            <Text style={styles.limitLabel}>Show: </Text>
            {LIMIT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.limitOption, limit === opt && styles.limitOptionActive]}
                onPress={() => { setLimit(opt); setPage(1); }}
              >
                <Text style={[styles.limitText, limit === opt && styles.limitTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading || checkingPurchases ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ef4444" />
            <Text style={styles.loadingText}>
              {checkingPurchases ? "Checking access..." : "Loading courses..."}
            </Text>
          </View>
        ) : filteredBatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="search" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No courses found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
            {hasFilters && (
              <TouchableOpacity style={styles.resetButton} onPress={clearFilters}>
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredBatches}
            renderItem={renderBatchCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            >
              <Feather name="chevron-left" size={16} color="#fff" />
              <Text style={styles.pageButtonText}>Prev</Text>
            </TouchableOpacity>

            <View style={styles.pageIndicator}>
              <Text style={styles.pageText}>{page}</Text>
              <Text style={styles.pageTotal}> / {totalPages}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
            >
              <Text style={styles.pageButtonText}>Next</Text>
              <Feather name="chevron-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Layout>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  searchSection: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#0f172a",
  },
  filtersSection: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  filtersContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: "#ef4444",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
  },
  filterTabTextActive: {
    color: "#ffffff",
  },
  clearFilter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    gap: 4,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ef4444",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  limitSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  limitLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  limitOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
  },
  limitOptionActive: {
    backgroundColor: "#ef4444",
  },
  limitText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#64748b",
  },
  limitTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: 12,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  imageContainer: {
    position: "relative",
    height: 100,
  },
  image: {
    width: "100%",
    height: "100%",
  },

  // Subscribed Badge (NEW)
  subscribedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  subscribedText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  discountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#ef4444",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "600",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  categoryText: {
    fontSize: 9,
    fontWeight: "500",
    color: "#ffffff",
  },
  cardContent: {
    padding: 10,
  },
  programTag: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ef4444",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    lineHeight: 16,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
  },
  studentsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  studentsText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#64748b",
  },

  // Access Button Small (NEW)
  accessButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  accessButtonTextSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: "#22c55e",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  originalPrice: {
    fontSize: 10,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  emiTag: {
    backgroundColor: "#10b981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emiText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },
  resetButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  resetButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  pageButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  pageButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  pageIndicator: {
    alignItems: "center",
  },
  pageText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardExpired: {
    opacity: 0.65,
    backgroundColor: "#f8f8f8",
  },
  expiredBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
  },
  expiredText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  expiredMessage: {
    fontSize: 13,
    color: "#ef4444",
    fontWeight: "500",
    marginTop: 6,
  },

  subscribedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#22c55e",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 10,
  },
  subscribedText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  pageTotal: {
    fontSize: 11,
    color: "#64748b",
  },
});