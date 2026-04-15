import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Image,
  Dimensions,
  StatusBar,
  ScrollView,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";

const { width } = Dimensions.get("window");

const BASE_URL = API_URL_LOCAL_ENDPOINT;
const QUIZ_ENDPOINT = `${BASE_URL}/quiz/quizzes`;
const BUNDLE_ENDPOINT = `${BASE_URL}/quiz-bundles`;

// ─── Skeleton Loader ────────────────────────────────────────────────────────
const SkeletonCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  return (
    <View style={sk.card}>
      <Animated.View style={[sk.img, { opacity }]} />
      <View style={sk.body}>
        <Animated.View style={[sk.line, { width: "60%", opacity }]} />
        <Animated.View style={[sk.line, { width: "90%", marginTop: 8, opacity }]} />
        <Animated.View style={[sk.line, { width: "40%", marginTop: 8, opacity }]} />
      </View>
    </View>
  );
};

// ─── Bundle Card ─────────────────────────────────────────────────────────────
const BundleCard = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => onPress?.(item));
  };
  const discount = item.discountPrice
    ? Math.round(((item.price - item.discountPrice) / item.price) * 100)
    : 0;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity activeOpacity={1} onPress={press} style={bc.wrap}>
        <Image source={{ uri: item.imageUrl }} style={bc.img} resizeMode="cover" />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.65)"]}
          style={bc.grad}
        >
          {discount > 0 && (
            <View style={bc.badge}>
              <Text style={bc.badgeText}>{discount}% OFF</Text>
            </View>
          )}
          <Text style={bc.title} numberOfLines={1}>
            {item.title.replace(/-/g, " ").toUpperCase()}
          </Text>
          <Text style={bc.desc} numberOfLines={2}>{item.description}</Text>
          <View style={bc.priceRow}>
            <Text style={bc.price}>₹{item.discountPrice ?? item.price}</Text>
            {item.discountPrice && (
              <Text style={bc.origPrice}>₹{item.price}</Text>
            )}
            <View style={bc.quizCount}>
              <Ionicons name="layers-outline" size={12} color="#e2e8f0" />
              <Text style={bc.quizCountText}>{item.quizzes?.length ?? 0} Quizzes</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Quiz Card ────────────────────────────────────────────────────────────────
const QuizCard = ({ item, onPress, index }) => {
  const translateY = useRef(new Animated.Value(32)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => onPress?.(item));
  };

  const mins = item.durationMinutes ?? Math.round((item.totalQuestions * item.timePerQuestion) / 60);
  const isFree = item.isFree;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }, { scale }] }}>
      <TouchableOpacity activeOpacity={1} onPress={handlePress} style={qc.card}>
        {/* Thumbnail */}
        <View style={qc.imgWrap}>
          <Image source={{ uri: item.image }} style={qc.img} resizeMode="cover" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.4)"]} style={qc.imgGrad} />
          {isFree ? (
            <View style={qc.freePill}>
              <Text style={qc.freePillText}>FREE</Text>
            </View>
          ) : (
            <View style={[qc.freePill, { backgroundColor: "#B11226" }]}>
              <Text style={qc.freePillText}>₹{item.price}</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={qc.body}>
          <View style={qc.tagRow}>
            <View style={qc.tag}>
              <Text style={qc.tagText}>{item.displayIn}</Text>
            </View>
            {item.status === "published" && (
              <View style={[qc.tag, { backgroundColor: "#dcfce7" }]}>
                <View style={[qc.dot, { backgroundColor: "#16a34a" }]} />
                <Text style={[qc.tagText, { color: "#166534" }]}>Live</Text>
              </View>
            )}
          </View>

          <Text style={qc.title} numberOfLines={2}>{item.title}</Text>

          <View style={qc.statsRow}>
            <View style={qc.stat}>
              <Ionicons name="help-circle-outline" size={14} color="#64748b" />
              <Text style={qc.statText}>{item.totalQuestions} Q</Text>
            </View>
            <View style={qc.statDivider} />
            <View style={qc.stat}>
              <Ionicons name="time-outline" size={14} color="#64748b" />
              <Text style={qc.statText}>{mins} min</Text>
            </View>
            <View style={qc.statDivider} />
            <View style={qc.stat}>
              <Ionicons name="trophy-outline" size={14} color="#64748b" />
              <Text style={qc.statText}>{item.totalMarks} pts</Text>
            </View>
            {item.negativeMarking && (
              <>
                <View style={qc.statDivider} />
                <View style={qc.stat}>
                  <Ionicons name="remove-circle-outline" size={14} color="#ef4444" />
                  <Text style={[qc.statText, { color: "#ef4444" }]}>Negative</Text>
                </View>
              </>
            )}
          </View>

          <View style={qc.footer}>
            <View style={qc.attempts}>
              <Ionicons name="people-outline" size={13} color="#64748b" />
              <Text style={qc.attemptsText}>{item.totalPurchases ?? 0} attempts</Text>
            </View>
            <View style={qc.arrowBtn}>
              <Ionicons name="arrow-forward" size={16} color="#B11226" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Filter Chip ──────────────────────────────────────────────────────────────
const FilterChip = ({ label, active, onPress, icon }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.75}
    style={[fc.chip, active && fc.active]}
  >
    {icon && <Ionicons name={icon} size={14} color={active ? "#fff" : "#64748b"} style={{ marginRight: 5 }} />}
    <Text style={[fc.text, active && fc.activeText]}>{label}</Text>
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AllQuizes({ navigation }) {
  const [quizes, setQuizes] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bundleLoading, setBundleLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeSection, setActiveSection] = useState("quizzes");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const searchRef = useRef(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    fetchQuizes(1, "");
    fetchBundles();
  }, []);

  const fetchQuizes = async (page = 1, search = "", append = false) => {
    try {
      if (!append) page === 1 && setLoading(true);
      else setLoadingMore(true);

      const params = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();

      const res = await axios.get(QUIZ_ENDPOINT, { params });
      const newData = res.data.data || [];
      const pages = res.data.pagination?.totalPages || 1;

      setQuizes(append ? (prev) => [...prev, ...newData] : newData);
      setTotalPages(pages);
      setCurrentPage(page);
    } catch (e) {
      console.log("Quiz fetch error:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  const fetchBundles = async () => {
    setBundleLoading(true);
    try {
      const res = await axios.get(BUNDLE_ENDPOINT);
      if (res.data?.success) setBundles(res.data.data || []);
    } catch (e) {
      console.error("Bundle error:", e);
    } finally {
      setBundleLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setCurrentPage(1);
      fetchQuizes(1, searchQuery);
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchQuizes(currentPage + 1, searchQuery, true);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchQuery("");
    setCurrentPage(1);
    fetchQuizes(1, "");
    fetchBundles();
  }, []);

  const handleQuizPress = useCallback((item) => {
    navigation?.navigate("QuizDetails", { quizId: item.id });
  }, [navigation]);

  const handleBundlePress = useCallback((item) => {
    navigation?.navigate("QuizBundleDetails", { bundleId: item.id });
  }, [navigation]);

  const filteredQuizzes = quizes.filter((q) => {
    if (activeFilter === "free") return q.isFree;
    if (activeFilter === "paid") return !q.isFree;
    return true;
  });

  const renderFooter = () =>
    loadingMore ? (
      <View style={s.footer}>
        <ActivityIndicator size="small" color="#B11226" />
        <Text style={s.footerText}>Loading more quizzes...</Text>
      </View>
    ) : null;

  const renderEmpty = () =>
    !loading ? (
      <View style={s.empty}>
        <Ionicons name="search-outline" size={56} color="#64748b" />
        <Text style={s.emptyTitle}>No quizzes found</Text>
        <Text style={s.emptySubtitle}>
          {searchQuery ? "Try different keywords" : "New quizzes coming soon"}
        </Text>
        {searchQuery && (
          <TouchableOpacity style={s.clearBtn} onPress={() => setSearchQuery("")}>
            <Text style={s.clearBtnText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    ) : null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── HEADER ── */}
      <Animated.View style={[s.header, { opacity: headerAnim }]}>
        <View style={s.headerContent}>
          {/* Brand */}
          <View style={s.brandRow}>
            <View>
              <Text style={s.brand}>DIKSHANT</Text>
              <Text style={s.brandSub}>IAS QUIZ ARENA</Text>
            </View>
            <TouchableOpacity style={s.iconBtn} onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={22} color="#B11226" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={s.searchBox}>
            <Ionicons name="search" size={20} color="#64748b" />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search quizzes..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Section Toggle */}
          <View style={s.sectionToggle}>
            <TouchableOpacity
              style={[s.toggleBtn, activeSection === "quizzes" && s.toggleActive]}
              onPress={() => setActiveSection("quizzes")}
            >
              <Ionicons name="help-circle-outline" size={16} color={activeSection === "quizzes" ? "#fff" : "#64748b"} />
              <Text style={[s.toggleText, activeSection === "quizzes" && s.toggleTextActive]}>
                Quizzes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleBtn, activeSection === "bundles" && s.toggleActive]}
              onPress={() => setActiveSection("bundles")}
            >
              <Ionicons name="layers-outline" size={16} color={activeSection === "bundles" ? "#fff" : "#64748b"} />
              <Text style={[s.toggleText, activeSection === "bundles" && s.toggleTextActive]}>
                Packages
              </Text>
              {bundles.length > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{bundles.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Filter chips */}
          {activeSection === "quizzes" && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.filterRow}
              contentContainerStyle={{ gap: 10, paddingRight: 8 }}
            >
              <FilterChip label="All" icon="apps-outline" active={activeFilter === "all"} onPress={() => setActiveFilter("all")} />
              <FilterChip label="Free" icon="gift-outline" active={activeFilter === "free"} onPress={() => setActiveFilter("free")} />
              <FilterChip label="Paid" icon="card-outline" active={activeFilter === "paid"} onPress={() => setActiveFilter("paid")} />
            </ScrollView>
          )}

          {/* Results count */}
          {!loading && (
            <View style={s.countRow}>
              <Text style={s.countText}>
                {activeSection === "quizzes"
                  ? `${filteredQuizzes.length} quiz${filteredQuizzes.length !== 1 ? "zes" : ""}`
                  : `${bundles.length} Package ${bundles.length !== 1 ? "s" : ""}`}
              </Text>
              <View style={[s.liveDot, { backgroundColor: "#16a34a" }]} />
              <Text style={[s.liveText, { color: "#166534" }]}>Live</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <ScrollView style={{ flex: 1 }}>
        {activeSection === "quizzes" ? (
          <>
            {loading ? (
              <View style={s.skeletonList}>
                {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
              </View>
            ) : (
              <FlatList
                data={filteredQuizzes}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item, index }) => (
                  <QuizCard item={item} onPress={handleQuizPress} index={index} />
                )}
                contentContainerStyle={s.list}
                ListEmptyComponent={renderEmpty}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                showsVerticalScrollIndicator={false}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            )}
          </>
        ) : (
          <>
            {bundleLoading ? (
              <View style={s.skeletonList}>
                {[1, 2].map((i) => <SkeletonCard key={i} />)}
              </View>
            ) : (
              <FlatList
                data={bundles}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <BundleCard item={item} onPress={handleBundlePress} />
                )}
                contentContainerStyle={s.list}
                showsVerticalScrollIndicator={false}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListEmptyComponent={
                  <View style={s.empty}>
                    <Ionicons name="layers-outline" size={56} color="#64748b" />
                    <Text style={s.emptyTitle}>No bundles available</Text>
                    <Text style={s.emptySubtitle}>Premium collections coming soon</Text>
                  </View>
                }
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ── CONTENT ── */}

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },

  header: { zIndex: 10, backgroundColor: "#ffffff" },
  headerContent: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  brand: {
    // fontFamily: "serif",
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 5,
  },
  brandSub: {
    fontSize: 11,
    color: "#B11226",
    letterSpacing: 3.5,
    fontWeight: "800",
    marginTop: 1,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "500",
  },

  sectionToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  toggleActive: { backgroundColor: "#B11226" },
  toggleText: { fontSize: 14, fontWeight: "700", color: "#64748b" },
  toggleTextActive: { color: "#ffffff" },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  countBadgeText: { fontSize: 11, color: "#fff", fontWeight: "800" },

  filterRow: { marginBottom: 12 },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countText: { fontSize: 13, color: "#475569", fontWeight: "600" },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#16a34a" },
  liveText: { fontSize: 13, color: "#166534", fontWeight: "700" },

  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  skeletonList: { padding: 16, gap: 14 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 10,
  },
  footerText: { fontSize: 14, color: "#64748b" },

  empty: {
    alignItems: "center",
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: { fontSize: 15, color: "#64748b", textAlign: "center" },
  clearBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: "#B11226",
    borderRadius: 14,
  },
  clearBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

// ─── Skeleton ──────────────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    height: 94,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  img: { width: 94, backgroundColor: "#e2e8f0" },
  body: { flex: 1, padding: 16, justifyContent: "center" },
  line: { height: 14, backgroundColor: "#e2e8f0", borderRadius: 7 },
});

// ─── Bundle Card ───────────────────────────────────────────────────────────────
const bc = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    height: 210,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  img: { ...StyleSheet.absoluteFillObject },
  grad: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    padding: 18,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#B11226",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  title: {
    fontSize: 17,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  desc: { fontSize: 13, color: "#e2e8f0", lineHeight: 18, marginBottom: 10 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { fontSize: 22, fontWeight: "900", color: "#ffffff" },
  origPrice: {
    fontSize: 15,
    color: "#cbd5e1",
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  quizCount: { flexDirection: "row", alignItems: "center", gap: 5, marginLeft: "auto" },
  quizCountText: { fontSize: 12, color: "#e2e8f0", fontWeight: "600" },
});

// ─── Quiz Card ─────────────────────────────────────────────────────────────────
const qc = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 114,
  },
  imgWrap: { width: 114, height: 120, position: "relative" },
  img: { width: "100%", height: "100%" },
  imgGrad: { ...StyleSheet.absoluteFillObject },
  freePill: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  freePillText: { fontSize: 10, fontWeight: "900", color: "#ffffff", letterSpacing: 0.6 },
  body: { flex: 1, padding: 14, justifyContent: "space-between" },
  tagRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  tag: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tagText: { fontSize: 11, color: "#475569", fontWeight: "700" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a" },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    lineHeight: 21,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12, color: "#475569", fontWeight: "600" },
  statDivider: { width: 1, height: 12, backgroundColor: "#e2e8f0" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  attempts: { flexDirection: "row", alignItems: "center", gap: 5 },
  attemptsText: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Filter Chip ───────────────────────────────────────────────────────────────
const fc = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  active: { backgroundColor: "#B11226", borderColor: "#B11226" },
  text: { fontSize: 13, fontWeight: "700", color: "#475569" },
  activeText: { color: "#ffffff" },
});