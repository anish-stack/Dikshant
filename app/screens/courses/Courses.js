import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import useSWR from "swr";
import axios from "axios";
import { fetcher } from "../../constant/fetcher";
import { useNavigation } from "@react-navigation/native";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 12;
const CARD_WIDTH = width * 0.72;

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG = {
  online: {
    label: "Live Courses",
    icon: "radio",
    accent: "#ef4444",
    light: "#fef2f2",
    badge: "#ef4444",
    type: "Online",
  },
  recorded: {
    label: "Recorded Courses",
    icon: "play-circle",
    accent: "#ef4444",
    light: "#f5f3ff",
    badge: "#ef4444",
    type: "Recorded",
  },
  offline: {
    label: "Offline / Hybrid",
    icon: "map-pin",
    accent: "#ef4444",
    light: "#fffbeb",
    badge: "#ef4444",
    type: "Offline",
  },
};

// ─── Pill Badge ───────────────────────────────────────────────────────────────
const Pill = ({ label, color, bg, icon }) => (
  <View style={[styles.pill, { backgroundColor: bg }]}>
    {icon && <Feather name={icon} size={10} color={color} />}
    <Text style={[styles.pillText, { color }]}>{label}</Text>
  </View>
);

// ─── Course Card ──────────────────────────────────────────────────────────────
const CourseCard = ({ item: batch, navigation, token, purchasedCourses, categoryKey }) => {
  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG.online;
  const purchaseData = purchasedCourses[batch.id];
  const isPurchased = !!purchaseData;



  const handlePress = () => {
    if (isPurchased) {
      console.log(batch.category)
      const url = ["online"].includes(batch.category)
        ? "my-course"
        : "my-course-subjects";
      navigation.navigate(url, { unlocked: true, courseId: batch.id });
    } else {
      navigation.navigate("CourseDetail", { courseId: batch.id, batchData: batch });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      activeOpacity={0.92}
      onPress={handlePress}
    >
      {/* Thumbnail */}
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: batch.imageUrl }}
          style={styles.thumb}
          resizeMode="cover"
        />
        {/* Gradient overlay via opacity block */}
        <View style={styles.thumbOverlay} />

        {/* Top-left badges */}
        <View style={styles.badgeRow}>
          {isPurchased ? (
            <View style={[styles.badge, { backgroundColor: "#22c55e" }]}>
              <Feather name="check-circle" size={10} color="#fff" />
              <Text style={styles.badgeText}>ENROLLED</Text>
            </View>
          ) : null}
        </View>

      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {/* Program name */}
        {batch.program?.name ? (
          <Text style={[styles.programLabel, { color: config.accent }]} numberOfLines={1}>
            {batch.program.name}
          </Text>
        ) : null}

        {/* Course name */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {batch.name}
        </Text>

        {/* Meta chips */}
        <View style={styles.metaRow}>
          {batch.medium ? (
            <Pill
              label={batch.medium}
              color="#64748b"
              bg="#f1f5f9"
              icon="globe"
            />
          ) : null}
          {batch.subjects?.length > 0 ? (
            <Pill
              label={`${batch.subjects.length} subjects`}
              color="#64748b"
              bg="#f1f5f9"
              icon="book-open"
            />
          ) : null}

        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Footer: price or go-to-class */}
        <View style={styles.cardFooter}>
          {isPurchased ? (
            <TouchableOpacity style={[styles.goBtn, { backgroundColor: config.light }]} onPress={handlePress}>
              <Feather name="play-circle" size={15} color={config.accent} />
              <Text style={[styles.goBtnText, { color: config.accent }]}>Go to Classroom</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.priceBlock}>
              {(batch.batchPrice === 0 || batch.batchDiscountPrice === 0) ? (
                <Text style={styles.freePrice}>FREE</Text>
              ) : batch.batchDiscountPrice && batch.batchDiscountPrice < batch.batchPrice ? (
                <>
                  <Text style={styles.strikePrice}>
                    ₹{batch.batchPrice.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.salePrice}>
                    ₹{batch.batchDiscountPrice.toLocaleString("en-IN")}
                  </Text>
                </>
              ) : (
                <Text style={styles.regularPrice}>
                  ₹{batch.batchPrice?.toLocaleString("en-IN")}
                </Text>
              )}
            </View>
          )}

          {!isPurchased && (
            <View style={[styles.enrollBtn, { backgroundColor: config.accent }]}>
              <Text style={styles.enrollBtnText}>Enroll</Text>
              <Feather name="arrow-right" size={13} color="#fff" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Section ──────────────────────────────────────────────────────────────────
const Section = ({ categoryKey, data, isLoading, error, navigation, token, purchasedCourses, onSeeAll }) => {
  const config = CATEGORY_CONFIG[categoryKey];

  const renderState = (icon, color, title, sub) => (
    <View style={[styles.stateBox, { borderColor: color + "33" }]}>
      <Feather name={icon} size={28} color={color} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateSub}>{sub}</Text>
    </View>
  );

  return (
    <View style={styles.section}>
      {/* Section header */}
      <View style={styles.sectionHead}>
        <View style={styles.sectionHeadLeft}>
          <View style={[styles.sectionIconWrap, { backgroundColor: config.light }]}>
            <Feather name={config.icon} size={16} color={config.accent} />
          </View>
          <Text style={styles.sectionTitle}>{config.label}</Text>
        </View>
        {!isLoading && !error && data?.length > 0 && (
          <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll} activeOpacity={0.7}>
            <Text style={[styles.seeAllText, { color: config.accent }]}>See all</Text>
            <Feather name="chevron-right" size={14} color={config.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator size="small" color={config.accent} />
          <Text style={styles.stateSub}>Loading…</Text>
        </View>
      ) : error ? (
        renderState("alert-circle", "#ef4444", "Couldn't load", "Please try again later")
      ) : !data || data.length === 0 ? (
        renderState("inbox", "#94a3b8", "No courses yet", "Check back soon")
      ) : (
        <FlatList
          data={data}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => `${categoryKey}-${item.id}`}
          renderItem={({ item }) => (
            <CourseCard
              item={item}
              navigation={navigation}
              token={token}
              purchasedCourses={purchasedCourses}
              categoryKey={categoryKey}
            />
          )}
          contentContainerStyle={styles.listPad}
          snapToInterval={CARD_WIDTH + CARD_MARGIN}
          snapToAlignment="start"
          decelerationRate="fast"
          initialNumToRender={3}
          maxToRenderPerBatch={5}
        />
      )}
    </View>
  );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Course({ refreshing }) {
  const navigation = useNavigation();
  const { token } = useAuthStore();
  const [purchasedCourses, setPurchasedCourses] = useState({});

  // API now returns { success, data: { online: [...], recorded: [...], offline: [...] } }
  const { data: apiResponse, error, isLoading, mutate } = useSWR(
    "/batchs/for-home-screen",
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 60000 }
  );

  const onlineCourses = (apiResponse?.data?.online || []).slice(0, 6);
  const recordedCourses = (apiResponse?.data?.recorded || []).slice(0, 6);
  const offlineCourses = (apiResponse?.data?.offline || []).slice(0, 6);

  const checkPurchaseStatus = async (batchIds) => {
    if (!token || batchIds.length === 0) return;
    const purchaseMap = {};
    try {
      await Promise.all(
        batchIds.map(async (batchId) => {
          try {
            const res = await axios.get(`${API_URL_LOCAL_ENDPOINT}/orders/already-purchased`, {
              params: { type: "batch", itemId: batchId },
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data?.purchased) purchaseMap[batchId] = res.data;
          } catch (e) {
            console.error(`Purchase check failed for ${batchId}:`, e);
          }
        })
      );
      setPurchasedCourses(purchaseMap);
    } catch (e) {
      console.error("Bulk purchase check failed:", e);
    }
  };

  useEffect(() => {
    const allIds = [...onlineCourses, ...recordedCourses, ...offlineCourses].map((c) => c.id);
    if (allIds.length > 0 && token) checkPurchaseStatus(allIds);
  }, [apiResponse, token]);

  useEffect(() => {
    if (refreshing) {
      mutate();
      const allIds = [...onlineCourses, ...recordedCourses, ...offlineCourses].map((c) => c.id);
      if (allIds.length > 0 && token) checkPurchaseStatus(allIds);
    }
  }, [refreshing]);

  const sharedProps = { isLoading, error, navigation, token, purchasedCourses };

  return (
    <ScrollView
      style={styles.root}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.rootContent}
    >
      <Section
        categoryKey="online"
        data={onlineCourses}
        onSeeAll={() => navigation?.navigate?.("Courses", { filter: "online" })}
        {...sharedProps}
      />
      <Section
        categoryKey="recorded"
        data={recordedCourses}
        onSeeAll={() => navigation?.navigate?.("Courses", { filter: "recorded" })}
        {...sharedProps}
      />
      <Section
        categoryKey="offline"
        data={offlineCourses}
        onSeeAll={() => navigation?.navigate?.("Courses", { filter: "offline" })}
        {...sharedProps}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8fafc" },
  rootContent: { paddingBottom: 32, paddingTop: 8 },

  // ── Section
  section: { marginBottom: 28 },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionHeadLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  seeAllText: { fontSize: 13, fontWeight: "600" },

  // ── List
  listPad: { paddingLeft: 16, paddingRight: 8 },

  // ── State boxes
  stateBox: {
    marginHorizontal: 16,
    height: 180,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  stateTitle: { fontSize: 14, fontWeight: "600", color: "#334155" },
  stateSub: { fontSize: 12, color: "#94a3b8" },

  // ── Card
  card: {
    marginRight: CARD_MARGIN,
    marginBottom: 4,
    borderRadius: 18,
    backgroundColor: "#fff",
    overflow: "hidden",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },

  // Thumbnail
  thumbWrap: { width: "100%", height: 152, position: "relative" },
  thumb: { width: "100%", height: "100%", backgroundColor: "#e2e8f0" },
  thumbOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    backgroundColor: "rgba(15,23,42,0.18)",
  },
  badgeRow: { position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.4 },
  catTag: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  catTagText: { fontSize: 9, fontWeight: "700", color: "#fff", letterSpacing: 0.5 },

  // Card body
  cardBody: { padding: 12 },
  programLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3, marginBottom: 3, textTransform: "uppercase" },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: -0.3,
  },

  // Meta
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: { fontSize: 10, fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#f1f5f9", marginBottom: 10 },

  // Footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceBlock: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  strikePrice: {
    fontSize: 12,
    fontWeight: "500",
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  salePrice: { fontSize: 17, fontWeight: "800", color: "#0f172a", letterSpacing: -0.3 },
  regularPrice: { fontSize: 17, fontWeight: "800", color: "#0f172a", letterSpacing: -0.3 },

  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  enrollBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
freePrice: {
  fontSize: 16,
  fontWeight: "700",
  color: "#22c55e"
},
  goBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  goBtnText: { fontSize: 13, fontWeight: "700" },
});