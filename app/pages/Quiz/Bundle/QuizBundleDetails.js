import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import RazorpayCheckout from "react-native-razorpay";
import { API_URL_LOCAL_ENDPOINT } from "../../../constant/api";
import { useAuthStore } from "../../../stores/auth.store";

const LOCAL_ENDPOINT = API_URL_LOCAL_ENDPOINT;
const BUNDLE_ENDPOINT = `${LOCAL_ENDPOINT}/quiz-bundles`;

const { width, height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.42;

// ── Colour palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#F5F6FA",
  surface: "#FFFFFF",
  surfaceAlt: "#F0F1F6",
  border: "#E8E9EF",
  primary: "#B11226",
  primaryLight: "#FDECEA",
  primaryMid: "#F4C5CB",
  gold: "#D97706",
  goldLight: "#FEF3C7",
  text: "#111827",
  textMid: "#374151",
  textSub: "#6B7280",
  textMuted: "#9CA3AF",
  green: "#16A34A",
  greenLight: "#DCFCE7",
  greenBorder: "#BBF7D0",
  shadow: "rgba(0,0,0,0.08)",
};

// ── Helper: format price ───────────────────────────────────────────────────────
const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ── Stat pill ─────────────────────────────────────────────────────────────────
const StatPill = ({ icon, label, color = C.textSub, bg = C.surfaceAlt }) => (
  <View style={[pill.wrap, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={14} color={color} />
    <Text style={[pill.text, { color }]}>{label}</Text>
  </View>
);

// ── Quiz row inside bundle (purchased view) ───────────────────────────────────
const QuizRow = ({ item, index, onPress, purchased }) => {
  const slideX = useRef(new Animated.Value(40)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 110, useNativeDriver: true }),
    ]).start(() => onPress(item, purchased));
  };

  const mins = item.durationMinutes
    ?? Math.round(((item.totalQuestions ?? 10) * (item.timePerQuestion ?? 30)) / 60);

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateX: slideX }, { scale }] }}>
      <TouchableOpacity activeOpacity={1} onPress={handlePress} style={qr.card}>
        {/* Thumbnail */}
        {item.image ? (
          <Image source={{ uri: item.image }} style={qr.thumb} resizeMode="cover" />
        ) : (
          <View style={[qr.thumb, { backgroundColor: C.primaryLight, justifyContent: "center", alignItems: "center" }]}>
            <Ionicons name="help-circle" size={28} color={C.primary} />
          </View>
        )}

        {/* Info */}
        <View style={qr.info}>
          <View style={qr.topRow}>
            {item.isFree && (
              <View style={qr.freeBadge}>
                <Text style={qr.freeBadgeText}>FREE</Text>
              </View>
            )}
            {item.status === "published" && (
              <View style={qr.liveBadge}>
                <View style={qr.liveDot} />
                <Text style={qr.liveBadgeText}>Live</Text>
              </View>
            )}
          </View>
          <Text style={qr.title} numberOfLines={2}>{item.title}</Text>
          <View style={qr.stats}>
            <Ionicons name="help-circle-outline" size={12} color={C.textMuted} />
            <Text style={qr.stat}>{item.totalQuestions ?? "—"}Q</Text>
            <View style={qr.div} />
            <Ionicons name="time-outline" size={12} color={C.textMuted} />
            <Text style={qr.stat}>{mins}m</Text>
            <View style={qr.div} />
            <Ionicons name="trophy-outline" size={12} color={C.textMuted} />
            <Text style={qr.stat}>{item.totalMarks ?? "—"}pts</Text>
          </View>
        </View>

        {/* Arrow */}
        <View style={qr.arrow}>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Payment status overlay ─────────────────────────────────────────────────────
const PaymentOverlay = ({ status }) => {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const isSuccess = status === "success";

  return (
    <Animated.View style={[po.backdrop, { opacity }]}>
      <Animated.View style={[po.card, { transform: [{ scale }] }]}>
        <View style={[po.iconWrap, { backgroundColor: isSuccess ? C.greenLight : C.primaryLight }]}>
          <Ionicons
            name={isSuccess ? "checkmark-circle" : "close-circle"}
            size={52}
            color={isSuccess ? C.green : C.primary}
          />
        </View>
        <Text style={po.title}>{isSuccess ? "Payment Successful!" : "Payment Failed"}</Text>
        <Text style={po.sub}>
          {isSuccess
            ? "You now have full access to this bundle."
            : "Something went wrong. Please try again."}
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function QuizBundleDetails({ route, navigation }) {
  const { bundleId } = route.params || {};

  // ── state ──────────────────────────────────────────────────────────────────
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loadingPurchaseStatus, setLoadingPurchaseStatus] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'failed'

    const {token,user} = useAuthStore()

  // ── animations ─────────────────────────────────────────────────────────────
  const heroScale = useRef(new Animated.Value(1.08)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(30)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerBg = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 80],
    outputRange: ["rgba(255,255,255,0)", "rgba(255,255,255,1)"],
    extrapolate: "clamp",
  });
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 120, HERO_HEIGHT - 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // ── fetch bundle ───────────────────────────────────────────────────────────
  const fetchBundle = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BUNDLE_ENDPOINT}/${bundleId}`);
      const data = res.data?.data ?? res.data;
      setBundle(data);

      // Animate in
      Animated.parallel([
        Animated.timing(heroScale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }),
      ]).start();

      await checkPurchaseStatus(data);
    } catch (e) {
      console.error("Bundle fetch error:", e.response.data);
      Alert.alert("Error", "Could not load bundle details.");
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  useEffect(() => { fetchBundle(); }, [fetchBundle]);

  // ── check purchase ─────────────────────────────────────────────────────────
  const checkPurchaseStatus = async (item) => {
    if (!token) { setLoadingPurchaseStatus(false); return; }

    try {
      setLoadingPurchaseStatus(true);
      const response = await axios.get(`${LOCAL_ENDPOINT}/orders/already-purchased`, {
        params: { type: "quiz_bundle", itemId: item?.id },
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(response.data)
      const { purchased = false } = response.data || {};
      setIsPurchased(purchased);
    } catch (error) {
      console.error("Purchase check error:", error);
      setIsPurchased(false);
    } finally {
      setLoadingPurchaseStatus(false);
    }
  };

  // ── payment ────────────────────────────────────────────────────────────────
  const createOrderAndPay = async () => {
    if (paying || isPurchased || !bundle) return;

    try {
      setPaying(true);
      setPaymentStatus(null);

      const orderRes = await axios.post(
        `${LOCAL_ENDPOINT}/orders`,
        {
          userId: user?.id,
          type: "quiz_bundle",
          itemId: bundle.id,
          amount: bundle.discountPrice ?? bundle.price,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorOrder, key } = orderRes.data?.data ?? orderRes.data;

      const options = {
        key,
        amount: razorOrder.amount,
        currency: "INR",
        name: "Dikshant IAS",
        description: bundle.title,
        image: "https://dikshantiasnew-web.s3.amazonaws.com/logo.png",
        order_id: razorOrder.id,
        prefill: {
          email: user?.email ?? "",
          contact: user?.phone ?? "",
          name: user?.name ?? "",
        },
        theme: { color: C.primary },
      };

      RazorpayCheckout.open(options)
        .then(async (data) => { await verifyPayment(data); })
        .catch((err) => {
          console.log("Razorpay cancelled:", err);
          setPaying(false);
          setPaymentStatus("failed");
          setTimeout(() => setPaymentStatus(null), 4000);
        });
    } catch (error) {
      console.error("Payment init error:", error.response.data);
      setPaying(false);
      setPaymentStatus("failed");
      Alert.alert("Payment Error", "Unable to initiate payment. Please try again.");
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

      setIsPurchased(true);
      setPaying(false);
      setPaymentStatus("success");
      setTimeout(() => { setPaymentStatus(null); fetchBundle(); }, 3000);
    } catch (error) {
      console.error("Verification failed:", error);
      setPaying(false);
      setPaymentStatus("failed");
      setTimeout(() => setPaymentStatus(null), 4000);
    }
  };

  // ── navigate to quiz ───────────────────────────────────────────────────────
  const handleQuizPress = (item, purchased) => {
    navigation?.navigate("QuizDetails", { quizId: item.id, purchased });
  };

  // ── loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Loading bundle...</Text>
      </SafeAreaView>
    );
  }

  if (!bundle) {
    return (
      <SafeAreaView style={s.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={52} color={C.textMuted} />
        <Text style={s.emptyTitle}>Bundle not found</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const discount = bundle.discountPrice
    ? Math.round(((bundle.price - bundle.discountPrice) / bundle.price) * 100)
    : 0;

  const quizzes = bundle.quizzes ?? [];
  const totalQuestions = quizzes.reduce((a, q) => a + (q.totalQuestions ?? 0), 0);
  const totalMins = quizzes.reduce(
    (a, q) => a + (q.durationMinutes ?? Math.round(((q.totalQuestions ?? 10) * (q.timePerQuestion ?? 30)) / 60)),
    0
  );

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── FLOATING HEADER ── */}
      <Animated.View style={[s.floatingHeader, { backgroundColor: headerBg }]}>
        <TouchableOpacity style={s.floatingBack} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Animated.Text style={[s.floatingTitle, { opacity: headerTitleOpacity }]} numberOfLines={1}>
          {bundle.title.replace(/-/g, " ")}
        </Animated.Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* ── HERO ── */}
        <View style={s.heroWrap}>
          <Animated.Image
            source={{ uri: bundle.imageUrl }}
            style={[s.heroImg, { transform: [{ scale: heroScale }], opacity: heroOpacity }]}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.15)", "rgba(0,0,0,0.0)", "rgba(245,246,250,1)"]}
            locations={[0, 0.4, 1]}
            style={s.heroGrad}
          />

          {/* Back button inside hero */}
          <TouchableOpacity style={s.heroBack} onPress={() => navigation?.goBack()}>
            <View style={s.heroBackInner}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Discount badge */}
          {discount > 0 && (
            <View style={s.discountBadge}>
              <Text style={s.discountText}>{discount}% OFF</Text>
            </View>
          )}

          {/* Purchased badge */}
          {isPurchased && (
            <View style={s.purchasedHeroBadge}>
              <Ionicons name="shield-checkmark" size={14} color={C.green} />
              <Text style={s.purchasedHeroBadgeText}>PURCHASED</Text>
            </View>
          )}
        </View>

        {/* ── CONTENT CARD ── */}
        <Animated.View style={[s.contentCard, { opacity: contentOpacity, transform: [{ translateY: contentY }] }]}>

          {/* Bundle title + description */}
          <View style={s.titleSection}>
            <Text style={s.bundleTitle}>{bundle.title.replace(/-/g, " ")}</Text>
            {bundle.description ? (
              <Text style={s.bundleDesc}>{bundle.description}</Text>
            ) : null}
          </View>

          {/* Stats row */}
          <View style={s.statsRow}>
            <StatPill icon="layers-outline" label={`${quizzes.length} Quizzes`} color={C.primary} bg={C.primaryLight} />
            <StatPill icon="help-circle-outline" label={`${totalQuestions}Q Total`} />
            <StatPill icon="time-outline" label={`${totalMins}m`} />
            {bundle.expirBundle && (
              <StatPill icon="calendar-outline" label="Limited" color={C.gold} bg={C.goldLight} />
            )}
          </View>

          {/* GST note */}
          {!isPurchased && bundle.gst ? (
            <Text style={s.gstNote}>* {bundle.gst}% GST applicable</Text>
          ) : null}

          {/* ── PRICING + CTA — only if NOT purchased ── */}
          {/* {!isPurchased && (
            <View style={s.purchaseBox}>
              <View style={s.priceBlock}>
                <Text style={s.priceMain}>{fmt(bundle.discountPrice ?? bundle.price)}</Text>
                {bundle.discountPrice && (
                  <Text style={s.priceStrike}>{fmt(bundle.price)}</Text>
                )}
              </View>

              {!token ? (
                <TouchableOpacity
                  style={s.ctaBtn}
                  onPress={() => navigation?.navigate("Login")}
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={s.ctaBtnText}>Login to Purchase</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.ctaBtn, paying && s.ctaBtnDisabled]}
                  onPress={createOrderAndPay}
                  activeOpacity={0.85}
                  disabled={paying}
                >
                  {paying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons name="flash" size={18} color="#fff" />
                  )}
                  <Text style={s.ctaBtnText}>
                    {paying ? "Processing..." : "Buy Now"}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={s.trustRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={C.green} />
                <Text style={s.trustText}>Secure payment via Razorpay</Text>
                <Ionicons name="lock-closed-outline" size={13} color={C.textMuted} />
                <Text style={s.trustText}>100% Safe</Text>
              </View>
            </View>
          )} */}

          {/* ── PURCHASED STATE ── */}
          {isPurchased && (
            <View style={s.purchasedBanner}>
              <View style={s.purchasedBannerIcon}>
                <Ionicons name="shield-checkmark" size={28} color={C.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.purchasedBannerTitle}>Bundle Unlocked!</Text>
                <Text style={s.purchasedBannerSub}>
                  You have full access to all {quizzes.length} quizzes below.
                </Text>
              </View>
            </View>
          )}

          {/* ── QUIZZES SECTION ── */}
          {quizzes.length > 0 && (
            <View style={s.quizzesSection}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>
                  {isPurchased ? "Your Quizzes" : "Included Quizzes"}
                </Text>
                <View style={s.sectionCount}>
                  <Text style={s.sectionCountText}>{quizzes.length}</Text>
                </View>
              </View>

              {/* If purchased — fully clickable list */}
              {isPurchased ? (
                quizzes.map((item, index) => (
                  <QuizRow
                    key={item.id.toString()}
                    item={item}
                    index={index}
                    onPress={handleQuizPress}
                    purchased={isPurchased}
                  />
                ))
              ) : (
                /* Not purchased — locked preview */
                quizzes.map((item, index) => (
                  <View key={item.id.toString()} style={lp.card}>
                    <View style={lp.num}>
                      <Text style={lp.numText}>{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={lp.title} numberOfLines={1}>{item.title}</Text>
                      <Text style={lp.sub}>{item.totalQuestions ?? "—"} questions · {item.isFree ? "Free" : "Paid"}</Text>
                    </View>
                    <View style={lp.lock}>
                      {item.isFree
                        ? <Ionicons name="lock-open-outline" size={16} color={C.green} />
                        : <Ionicons name="lock-closed-outline" size={16} color={C.textMuted} />
                      }
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </Animated.ScrollView>

      {/* ── STICKY BOTTOM CTA (not purchased) ── */}
      {!isPurchased && !loading && (
        <View style={s.stickyBottom}>
          <View style={s.stickyPrice}>
            <Text style={s.stickyPriceMain}>{fmt(bundle.discountPrice ?? bundle.price)}</Text>
            {bundle.discountPrice && (
              <Text style={s.stickyPriceStrike}>{fmt(bundle.price)}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[s.stickyBtn, paying && s.ctaBtnDisabled]}
            onPress={!token ? () => navigation?.navigate("Login") : createOrderAndPay}
            activeOpacity={0.85}
            disabled={paying}
          >
            {paying
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="flash" size={16} color="#fff" />
            }
            <Text style={s.stickyBtnText}>
              {!token ? "Login to Buy" : paying ? "Processing..." : "Buy Bundle"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── PAYMENT OVERLAY ── */}
      {paymentStatus && <PaymentOverlay status={paymentStatus} />}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Loading / error states
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: C.textSub, fontWeight: "600" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.textMid, marginTop: 10 },
  backBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 11,
    backgroundColor: C.primary,
    borderRadius: 12,
  },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Floating header
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: 48,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  floatingBack: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    marginHorizontal: 8,
    letterSpacing: 0.3,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  // Hero
  heroWrap: {
    width,
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImg: {
    width: "100%",
    height: "100%",
  },
  heroGrad: {
    ...StyleSheet.absoluteFillObject,
  },
  heroBack: {
    position: "absolute",
    top: 52,
    left: 16,
  },
  heroBackInner: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 54,
    right: 16,
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  discountText: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  purchasedHeroBadge: {
    position: "absolute",
    bottom: 70,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.greenLight,
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  purchasedHeroBadgeText: { fontSize: 10, fontWeight: "900", color: C.green, letterSpacing: 1 },

  // Content card
  contentCard: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  // Title section
  titleSection: { marginBottom: 16 },
  bundleTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: C.text,
    letterSpacing: 0.2,
    textTransform: "capitalize",
    marginBottom: 6,
  },
  bundleDesc: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 21,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  gstNote: { fontSize: 11, color: C.textMuted, marginBottom: 16, fontStyle: "italic" },

  // Purchase box
  purchaseBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  priceBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 16,
  },
  priceMain: { fontSize: 32, fontWeight: "900", color: C.text },
  priceStrike: {
    fontSize: 17,
    color: C.textMuted,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaBtnDisabled: { opacity: 0.65 },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 12,
  },
  trustText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },

  // Purchased banner
  purchasedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: C.greenLight,
    borderWidth: 1,
    borderColor: C.greenBorder,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },
  purchasedBannerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  purchasedBannerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: C.green,
    marginBottom: 3,
  },
  purchasedBannerSub: { fontSize: 13, color: "#166534", lineHeight: 18 },

  // Quizzes section
  quizzesSection: { marginBottom: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: C.text },
  sectionCount: {
    backgroundColor: C.primaryLight,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.primaryMid,
  },
  sectionCountText: { fontSize: 13, fontWeight: "800", color: C.primary },

  // Sticky bottom
  stickyBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingBottom: 48,
    borderTopWidth: 1,
    borderTopColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 10,
    gap: 14,
  },
  stickyPrice: { flex: 1 },
  stickyPriceMain: { fontSize: 22, fontWeight: "900", color: C.text },
  stickyPriceStrike: {
    fontSize: 13,
    color: C.textMuted,
    textDecorationLine: "line-through",
    fontWeight: "600",
  },
  stickyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 7,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  stickyBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

// ── Stat Pill ─────────────────────────────────────────────────────────────────
const pill = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: { fontSize: 12, fontWeight: "700" },
});

// ── Quiz Row (purchased) ──────────────────────────────────────────────────────
const qr = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    height: 88,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  thumb: { width: 88, height: "100%", height: 88 },
  info: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  topRow: { flexDirection: "row", gap: 6, marginBottom: 5 },
  freeBadge: {
    backgroundColor: C.greenLight,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  freeBadgeText: { fontSize: 9, fontWeight: "900", color: C.green, letterSpacing: 1 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.greenLight,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.greenBorder,
  },
  liveDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: C.green },
  liveBadgeText: { fontSize: 9, fontWeight: "900", color: C.green },
  title: { fontSize: 13, fontWeight: "800", color: C.text, lineHeight: 18, marginBottom: 6 },
  stats: { flexDirection: "row", alignItems: "center", gap: 5 },
  stat: { fontSize: 11, color: C.textSub, fontWeight: "600" },
  div: { width: 1, height: 9, backgroundColor: C.border },
  arrow: {
    paddingHorizontal: 14,
    height: "100%",
    justifyContent: "center",
  },
});

// ── Locked Preview Row ────────────────────────────────────────────────────────
const lp = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  num: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
  numText: { fontSize: 13, fontWeight: "800", color: C.textSub },
  title: { fontSize: 13, fontWeight: "700", color: C.textMid, marginBottom: 3 },
  sub: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  lock: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surfaceAlt,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
  },
});

// ── Payment Overlay ───────────────────────────────────────────────────────────
const po = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(245,246,250,0.88)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    width: width * 0.78,
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 20,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: C.text,
    marginBottom: 8,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    color: C.textSub,
    textAlign: "center",
    lineHeight: 20,
  },
});