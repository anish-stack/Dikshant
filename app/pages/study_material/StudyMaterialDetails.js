import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import RazorpayCheckout from "react-native-razorpay";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import api from "../../constant/fetcher";

const { width } = Dimensions.get("window");

// ─── HTML Description wrapper ──────────────────────────────────────────────
const wrapHtml = (html) => `
<!DOCTYPE html><html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
    font-size:14px;color:#334155;background:transparent;padding:4px 0 8px;line-height:1.75;}
  .dlp-container{background:#fff;border-radius:14px;padding:18px 16px;border:1px solid #E2E8F0;}
  .dlp-header h2{font-size:17px;color:#0F172A;margin-bottom:6px;font-weight:700;}
  .dlp-subtitle{color:#64748B;font-size:13px;margin-bottom:18px;line-height:1.6;}
  .dlp-section{margin-bottom:16px;}
  .dlp-section h3{color:#4F46E5;font-size:13.5px;font-weight:700;margin-bottom:7px;}
  .dlp-section ul{padding-left:15px;}
  .dlp-section li{margin-bottom:5px;color:#475569;font-size:13px;}
  h2{font-size:17px;color:#0F172A;margin-bottom:8px;font-weight:700;}
  h3{color:#4F46E5;font-size:13.5px;font-weight:700;margin-bottom:7px;}
  p{color:#475569;font-size:13px;margin-bottom:8px;}
  ul{padding-left:15px;margin-bottom:12px;}
  li{color:#475569;font-size:13px;margin-bottom:5px;}
  strong{color:#0F172A;font-weight:600;}
</style>
</head>
<body>${html}</body>
</html>`;

// ─── Info Chip ─────────────────────────────────────────────────────────────
const InfoChip = ({ icon, label, value, valueColor }) => (
  <View style={styles.infoChip}>
    <View style={styles.infoChipIcon}>
      <Icon name={icon} size={15} color="#ef4444" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoChipLabel}>{label}</Text>
      <Text style={[styles.infoChipValue, valueColor && { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

// ─── Payment Result Modal (Success / Error) ────────────────────────────────
const PaymentResultModal = ({ visible, type, title, message, onPrimary, onSecondary, primaryLabel, secondaryLabel }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.resultOverlay}>
      <View style={styles.resultCard}>
        {/* Icon */}
        <View style={[
          styles.resultIconWrap,
          { backgroundColor: type === "success" ? "#F0FDF4" : type === "error" ? "#FEF2F2" : "#FFFBEB" }
        ]}>
          <Icon
            name={type === "success" ? "check-circle" : type === "error" ? "close-circle" : "alert-circle"}
            size={52}
            color={type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#F59E0B"}
          />
        </View>

        <Text style={styles.resultTitle}>{title}</Text>
        <Text style={styles.resultMessage}>{message}</Text>

        {primaryLabel && (
          <TouchableOpacity
            style={[
              styles.resultPrimaryBtn,
              { backgroundColor: type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#F59E0B" }
            ]}
            onPress={onPrimary}
          >
            <Text style={styles.resultPrimaryText}>{primaryLabel}</Text>
          </TouchableOpacity>
        )}

        {secondaryLabel && (
          <TouchableOpacity style={styles.resultSecondaryBtn} onPress={onSecondary}>
            <Text style={styles.resultSecondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  </Modal>
);

// ─── Hardcopy Delivery Modal ───────────────────────────────────────────────
const HardcopyModal = ({ visible, onClose, onSubmit, submitting }) => {
  const [form, setForm] = useState({ studentName: "", contactNumber: "", address: "", pincode: "" });
  const setField = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const validate = () => {
    if (!form.studentName.trim()) return "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(form.contactNumber)) return "Enter a valid 10-digit mobile number.";
    if (form.address.trim().length < 15) return "Enter a complete address (min 15 characters).";
    if (!/^\d{6}$/.test(form.pincode)) return "Enter a valid 6-digit pincode.";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) return Alert.alert("Missing Details", err);
    onSubmit(form);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View style={styles.modalHeaderIcon}>
                <Icon name="package-variant-closed" size={18} color="#ef4444" />
              </View>
              <View>
                <Text style={styles.modalTitle}>Delivery Details</Text>
                <Text style={styles.modalSubtitle}>We'll ship the hard copy to this address</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <View style={styles.closeBtn}>
                <Icon name="close" size={18} color="#64748B" />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {[
              { key: "studentName", label: "Full Name *", icon: "account-outline", placeholder: "Enter your full name", keyboard: "default", autoCapitalize: "words" },
              { key: "contactNumber", label: "Mobile Number *", icon: "phone-outline", placeholder: "10-digit mobile number", keyboard: "phone-pad", maxLength: 10 },
              { key: "pincode", label: "Pincode *", icon: "mailbox-outline", placeholder: "6-digit pincode", keyboard: "number-pad", maxLength: 6 },
            ].map((f) => (
              <View key={f.key} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <View style={styles.inputWrap}>
                  <Icon name={f.icon} size={17} color="#94A3B8" style={{ marginRight: 10 }} />
                  <TextInput
                    style={styles.input}
                    placeholder={f.placeholder}
                    placeholderTextColor="#94A3B8"
                    value={form[f.key]}
                    onChangeText={(v) => setField(f.key, v)}
                    keyboardType={f.keyboard || "default"}
                    maxLength={f.maxLength}
                    autoCapitalize={f.autoCapitalize || "none"}
                  />
                </View>
              </View>
            ))}

            {/* Address multiline */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Full Address *</Text>
              <View style={[styles.inputWrap, { alignItems: "flex-start", paddingTop: 12 }]}>
                <Icon name="map-marker-outline" size={17} color="#94A3B8" style={{ marginRight: 10, marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: "top", paddingTop: 0 }]}
                  placeholder="House no., Street, City, State"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={form.address}
                  onChangeText={(v) => setField("address", v)}
                />
              </View>
            </View>

            {/* Shipping note */}
            <View style={styles.shippingNote}>
              <Icon name="truck-fast-outline" size={16} color="#ef4444" />
              <Text style={styles.shippingNoteText}>
               The printed/hard copy of the notes will be delivered to the address provided above within 10 to 15 working days.

              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="cart-arrow-right" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Proceed to Payment</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────
export default function StudyMaterialDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { slug: materialId } = route.params || {};

  const [material, setMaterial] = useState(null);
  const [purchaseData, setPurchaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [webViewHeight, setWebViewHeight] = useState(300);
  const [hardcopyModalVisible, setHardcopyModalVisible] = useState(false);
  const [coverError, setCoverError] = useState(false);

  // Payment result modal state
  const [resultModal, setResultModal] = useState({
    visible: false,
    type: "success",        // "success" | "error" | "warning"
    title: "",
    message: "",
    primaryLabel: "",
    secondaryLabel: "",
    onPrimary: null,
    onSecondary: null,
  });

  const showResult = (opts) => setResultModal({ visible: true, ...opts });
  const hideResult = () => setResultModal((p) => ({ ...p, visible: false }));

  useEffect(() => {
    if (materialId) {
      fetchMaterial();
      checkPurchaseStatus();
    }
  }, [materialId]);

  const fetchMaterial = async () => {
    try {
      const res = await api.get(`/study-materials/materials/${materialId}`);
      setMaterial(res.data.data);
    } catch {
      Alert.alert("Error", "Failed to load material details.");
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async () => {
    try {
      const res = await api.get(`/study-materials/check-purchase/${materialId}`);
      setPurchaseData(res.data.success && res.data.purchased ? res.data.data : null);
    } catch {
      setPurchaseData(null);
    }
  };



  // ── Payment ──────────────────────────────────────────────────────────────
  const initiatePayment = async (deliveryDetails = null) => {
    if (!material) return;

    setPurchasing(true);

    try {
      const body = deliveryDetails
        ? { materialId: material.id, ...deliveryDetails }
        : { materialId: material.id };

      const orderRes = await api.post("/study-materials/materials/order", body);
      const { orderId, key, amount, currency } = orderRes.data.data;

      const options = {
        description: material.shortDescription || "Study Material",
        image: material.coverImage || "",
        currency: currency || "INR",
        key,
        amount,
        name: "Dikshant IAS",
        order_id: orderId,
        theme: { color: "#ef4444" },
      };

      const payData = await RazorpayCheckout.open(options);

      await verifyPayment(
        payData.razorpay_payment_id,
        payData.razorpay_order_id,
        payData.razorpay_signature
      );

    } catch (error) {

      const serverMessage = error?.response?.data?.message;
      const description = error?.description;

      const cancelled =
        error?.code === "BAD_REQUEST_ERROR" ||
        description?.toLowerCase()?.includes("cancel");

      showResult({
        type: cancelled ? "warning" : "error",
        title: cancelled ? "Payment Cancelled" : "Payment Error",
        message:
          serverMessage ||
          description ||
          (cancelled
            ? "You cancelled the payment."
            : "Something went wrong while processing your payment. Please try again."),
        primaryLabel: cancelled ? "Try Again" : "Retry Payment",
        secondaryLabel: "Go Back",
        onPrimary: () => {
          hideResult();
          setTimeout(() => initiatePayment(deliveryDetails), 300);
        },
        onSecondary: hideResult,
      });

    } finally {
      setPurchasing(false);
      setHardcopyModalVisible(false);
    }
  };

  const verifyPayment = async (paymentId, orderId, signature) => {
    try {
      const res = await api.post("/study-materials/materials/verify-payment", {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        materialId: material.id,
      });

      if (res.data.success) {
        await checkPurchaseStatus();
        showResult({
          type: "success",
          title: "Payment Successful!",
          message: `You've successfully unlocked "${material.title}". Enjoy your learning journey!`,
          primaryLabel: material.fileUrl ? "View Material" : "Done",
          secondaryLabel: material.fileUrl ? "Later" : null,
          onPrimary: () => { hideResult(); if (material.fileUrl) openMaterial(); },
          onSecondary: hideResult,
        });
      }
    } catch {
      showResult({
        type: "warning",
        title: "Verification Pending",
        message: "Payment was received but verification is pending. If not resolved in 24hrs, contact support.",
        primaryLabel: "Contact Support",
        secondaryLabel: "Close",
        onPrimary: () => { hideResult(); Linking.openURL("mailto:support@dikshantias.com"); },
        onSecondary: hideResult,
      });
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleBuyNow = () => {
    if (material.isHardCopy) {
      setHardcopyModalVisible(true);
    } else {
      initiatePayment(null);
    }
  };

  // Repurchase — show confirm dialog then initiate
  const handleRepurchase = () => {
    Alert.alert(
      "Repurchase Material",
      `You already own "${material.title}". Do you want to purchase again (e.g. for a hard copy or gift)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Repurchase",
          onPress: () => {
            if (material.isHardCopy) setHardcopyModalVisible(true);
            else initiatePayment(null);
          },
        },
      ]
    );
  };

  const downloadPdf = async () => {
    if (!material?.fileUrl) return Alert.alert("Unavailable", "No file attached.");
    setDownloading(true);
    try {
      const fileName = material.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".pdf";
      const fileUri = FileSystem.documentDirectory + fileName;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) { await openFile(fileUri); return; }
      const dl = FileSystem.createDownloadResumable(material.fileUrl, fileUri);
      const { uri } = await dl.downloadAsync();
      if (!uri) throw new Error("No URI");
      await openFile(uri);
    } catch {
      Alert.alert("Download Failed", "Check your connection and try again.");
    } finally {
      setDownloading(false);
    }
  };

  const openFile = async (fileUri) => {
    try {
      if (Platform.OS === "android") {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
          data: contentUri, type: "application/pdf", flags: 1,
        });
      } else {
        await Sharing.shareAsync(fileUri);
      }
    } catch {
      await Sharing.shareAsync(fileUri).catch(() => Alert.alert("Saved", `Saved at: ${fileUri}`));
    }
  };

  const openMaterial = () => {
    if (material?.fileUrl) Linking.openURL(material.fileUrl).catch(() => { });
  };

  const openSamplePdf = () => {
    if (material?.samplePdf) Linking.openURL(material.samplePdf).catch(() => { });
  };

  // ── Loading / Error States ────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Loading details…</Text>
      </SafeAreaView>
    );
  }

  if (!material) {
    return (
      <SafeAreaView style={styles.centered}>
        <Icon name="alert-circle-outline" size={60} color="#E2E8F0" />
        <Text style={styles.loadingText}>Material not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isPaid = material.isPaid && parseFloat(material.price || 0) > 0;
  const isHardCopy = material.isHardCopy === true;
  const isDownloadable = material.isDownloadable !== false;
  const hasSample = !!material.samplePdf;
  const hasFile = !!material.fileUrl;
  const price = parseFloat(material.price || 0).toFixed(0);
  const isPurchased = !!purchaseData;

  // Bottom bar height = content + bottom safe area inset (avoids tab bar overlap)
  const BOTTOM_BAR_CONTENT_HEIGHT = 76;
  const bottomBarHeight = BOTTOM_BAR_CONTENT_HEIGHT + insets.bottom;

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {material.category?.name || "Material Details"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Scroll Content ───────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover */}
        <View style={styles.coverWrap}>
          {!coverError && material.coverImage ? (
            <Image
              source={{ uri: material.coverImage }}
              style={styles.coverImage}
              resizeMode="cover"
              onError={() => setCoverError(true)}
            />
          ) : (
            <View style={styles.coverFallback}>
              <Icon name="book-open-page-variant-outline" size={72} color="#A5B4FC" />
              <Text style={styles.coverFallbackText}>{material.category?.name || "Study Material"}</Text>
            </View>
          )}

          {/* Overlay badges */}
          <View style={styles.badgeRow}>
            {material.category?.name && (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{material.category.name}</Text>
              </View>
            )}
            {isHardCopy && (
              <View style={styles.hardcopyBadge}>
                <Icon name="package-variant-closed" size={11} color="#92400E" />
                <Text style={styles.hardcopyBadgeText}>Hard Copy</Text>
              </View>
            )}
            {!isPaid && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>FREE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>

          {/* Title */}
          <Text style={styles.title}>{material.title}</Text>
          {!!material.shortDescription && (
            <Text style={styles.shortDesc}>{material.shortDescription}</Text>
          )}

          {/* ── Purchased Banner ──────────────────────────────────────── */}
          {isPurchased && (
            <View style={styles.purchasedCard}>
              <View style={styles.purchasedIconWrap}>
                <Icon name="check-decagram" size={26} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.purchasedTitle}>Already Purchased</Text>
                <Text style={styles.purchasedSubtitle}>
                  {purchaseData.accessType && `${purchaseData.accessType} • `}
                  {purchaseData.purchaseDate
                    ? new Date(purchaseData.purchaseDate).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })
                    : "Active"}
                </Text>
              </View>
              {isPaid && (
                <TouchableOpacity onPress={() => navigation.navigate("check-status", { purchaseId: purchaseData.id })} style={styles.repurchaseBtn}>
                  <Text style={styles.repurchaseText}>Check Status</Text>
                </TouchableOpacity>
              )}

            </View>
          )}

          {/* ── Info Chips ────────────────────────────────────────────── */}
          <View style={styles.infoGrid}>
            <InfoChip
              icon="cash-multiple"
              label="Price"
              value={isPaid ? `₹${price}` : "Free"}
              valueColor={isPaid ? "#059669" : "#ef4444"}
            />
            <InfoChip
              icon="download-circle-outline"
              label="Downloadable"
              value={isDownloadable ? "Yes" : "No"}
              valueColor={isDownloadable ? "#059669" : "#EF4444"}
            />
            <InfoChip
              icon="package-variant"
              label="Hard Copy"
              value={isHardCopy ? "Available" : "Not Available"}
              valueColor={isHardCopy ? "#D97706" : "#94A3B8"}
            />
            <InfoChip
              icon="calendar-outline"
              label="Added On"
              value={new Date(material.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            />
          </View>

          {/* ── Price Card (only if paid + not purchased) ─────────────── */}
          {isPaid && !isPurchased && (
            <View style={styles.priceCard}>
              <View>
                <Text style={styles.priceCardLabel}>Total Amount</Text>
                <Text style={styles.priceCardNote}>Inclusive of all taxes</Text>
              </View>
              <Text style={styles.priceCardValue}>₹{price}</Text>
            </View>
          )}

          {/* ── Sample PDF ────────────────────────────────────────────── */}
          {hasSample && (
            <TouchableOpacity style={styles.sampleBtn} onPress={openSamplePdf}>
              <View style={styles.sampleBtnLeft}>
                <View style={styles.sampleIcon}>
                  <Icon name="file-eye-outline" size={18} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.sampleBtnTitle}>View Sample PDF</Text>
                  <Text style={styles.sampleBtnSub}>Preview before purchase</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}

          {/* ── Description via WebView ───────────────────────────────── */}
          {!!material.description && (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>About this Material</Text>
              <WebView
                originWhitelist={["*"]}
                source={{ html: wrapHtml(material.description) }}
                style={{ width: width - 32, height: webViewHeight, backgroundColor: "transparent" }}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
                onMessage={(e) => {
                  const h = parseInt(e.nativeEvent.data, 10);
                  if (!isNaN(h)) setWebViewHeight(h + 32);
                }}
                injectedJavaScript={`window.ReactNativeWebView.postMessage(document.documentElement.scrollHeight.toString()); true;`}
              />
            </View>
          )}

          {/* ── Trust Strip ───────────────────────────────────────────── */}
          <View style={styles.trustStrip}>
            {[
              { icon: "shield-lock-outline", label: "Secure\nPayment" },
              { icon: "truck-fast-outline", label: "Fast\nShipping" },
              { icon: "headset", label: "24/7\nSupport" },
              { icon: "refresh-circle", label: "Easy\nReturns" },
            ].map((item) => (
              <View key={item.label} style={styles.trustItem}>
                <View style={styles.trustIcon}>
                  <Icon name={item.icon} size={18} color="#ef4444" />
                </View>
                <Text style={styles.trustLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

        </View>
      </ScrollView>

      {/* ── Fixed Bottom Action Bar ───────────────────────────────────────
          Uses insets.bottom to sit ABOVE the device's home indicator / nav bar
          WITHOUT overlapping the tab navigator (SafeAreaView edges={["top"]} +
          paddingBottom: insets.bottom handles this correctly when the tab bar
          itself already consumes its own safe area). If your tab bar does NOT
          add safe area padding, replace insets.bottom with
          insets.bottom + TAB_BAR_HEIGHT.
      ─────────────────────────────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 14 }]}>

        {/* FREE material */}
        {!isPaid && (
          <View style={styles.bottomRow}>
            {hasFile && isDownloadable && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: "#ef4444", flex: 1 }]}
                onPress={downloadPdf}
                disabled={downloading}
              >
                {downloading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Icon name="download-outline" size={19} color="#fff" />
                    <Text style={styles.primaryBtnText}>Download PDF</Text>
                  </>
                }
              </TouchableOpacity>
            )}
            {hasFile && (
              <TouchableOpacity
                style={[styles.outlineBtn, hasFile && isDownloadable && { flex: 0.7 }]}
                onPress={openMaterial}
              >
                <Icon name="eye-outline" size={19} color="#ef4444" />
                <Text style={styles.outlineBtnText}>Preview</Text>
              </TouchableOpacity>
            )}
            {!hasFile && (
              <View style={styles.noFileBar}>
                <Icon name="information-outline" size={16} color="#ef4444" />
                <Text style={styles.noFileText}>No file available yet. Contact support.</Text>
              </View>
            )}
          </View>
        )}

        {/* PAID + PURCHASED */}
        {isPaid && isPurchased && (
          <View style={styles.bottomRow}>
            {/* Access file */}
            {hasFile ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: "#10B981" }]}
                onPress={() => {
                  if (isDownloadable) downloadPdf();
                  else openMaterial();
                }}
                disabled={downloading}
              >
                {downloading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Icon name={isDownloadable ? "download-outline" : "eye-outline"} size={19} color="#fff" />
                    <Text style={styles.primaryBtnText}>
                      {isDownloadable ? "Download PDF" : "View Material"}
                    </Text>
                  </>
                }
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: "#1f811c" }]}
                disabled={true}
              >
                {downloading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                    <Icon name="check-decagram" size={26} color="#e7fff7" />
                    <Text style={styles.primaryBtnText}>
                      Already Purchased
                    </Text>
                  </>
                }
              </TouchableOpacity>
            )}
            {/* Repurchase */}
            {isPaid && (
              <TouchableOpacity
                style={[styles.outlineBtn, hasFile && { flex: 0.65 }]}
                onPress={handleRepurchase}
              >
                <Icon name="refresh" size={17} color="#ef4444" />
                <Text style={styles.outlineBtnText}>Repurchase</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* PAID + NOT PURCHASED */}
        {isPaid && !isPurchased && (
          <View style={styles.bottomRow}>
            <View style={styles.bottomPriceTag}>
              <Text style={styles.bottomPriceLabel}>₹{price}</Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={handleBuyNow}
              disabled={purchasing}
            >
              {purchasing
                ? <ActivityIndicator color="#fff" size="small" />
                : <>
                  <Icon
                    name={isHardCopy ? "package-variant-closed" : "cart-outline"}
                    size={19}
                    color="#fff"
                  />
                  <Text style={styles.primaryBtnText}>
                    {isHardCopy ? "Buy Hard Copy" : "Buy Now"}
                  </Text>
                </>
              }
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* ── Hardcopy Modal ────────────────────────────────────────────────── */}
      <HardcopyModal
        visible={hardcopyModalVisible}
        onClose={() => setHardcopyModalVisible(false)}
        onSubmit={(form) => initiatePayment(form)}
        submitting={purchasing}
      />

      {/* ── Payment Result Modal ──────────────────────────────────────────── */}
      <PaymentResultModal
        visible={resultModal.visible}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        primaryLabel={resultModal.primaryLabel}
        secondaryLabel={resultModal.secondaryLabel}
        onPrimary={resultModal.onPrimary}
        onSecondary={resultModal.onSecondary}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC", padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: "#64748B" },
  goBackBtn: { marginTop: 20, backgroundColor: "#ef4444", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  goBackText: { color: "#fff", fontWeight: "700" },

  // Nav
  topNav: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#F8FAFC",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E2E8F0",
  },
  navTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", flex: 1, textAlign: "center" },

  scrollContent: { paddingBottom: 0 },

  // Cover
  coverWrap: { position: "relative" },
  coverImage: { width: "100%", height: 260 },
  coverFallback: {
    width: "100%", height: 260, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  coverFallbackText: { fontSize: 14, color: "#818CF8", fontWeight: "600" },
  badgeRow: { position: "absolute", bottom: 14, left: 14, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  catBadge: { backgroundColor: "rgba(79,70,229,0.9)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  catBadgeText: { color: "#fff", fontSize: 11.5, fontWeight: "600" },
  hardcopyBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(251,191,36,0.95)", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
  },
  hardcopyBadgeText: { color: "#92400E", fontSize: 11.5, fontWeight: "700" },
  freeBadge: { backgroundColor: "#10B981", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  freeBadgeText: { color: "#fff", fontSize: 11.5, fontWeight: "700" },

  // Body
  body: { padding: 16 },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A", lineHeight: 27, marginBottom: 7 },
  shortDesc: { fontSize: 14, color: "#64748B", lineHeight: 21, marginBottom: 18 },

  // Purchased card
  purchasedCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F0FDF4", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#86EFAC", marginBottom: 18,
    gap: 12,
  },
  purchasedIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: "#DCFCE7",
    alignItems: "center", justifyContent: "center",
  },
  purchasedTitle: { fontSize: 14, fontWeight: "700", color: "#166534" },
  purchasedSubtitle: { fontSize: 11.5, color: "#4ADE80", marginTop: 2 },
  repurchaseBtn: {
    backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: "#86EFAC",
  },
  repurchaseText: { fontSize: 11.5, color: "#166534", fontWeight: "700" },

  // Info chips
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 18 },
  infoChip: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    borderRadius: 12, padding: 11, borderWidth: 1, borderColor: "#E2E8F0", width: "48%",
  },
  infoChipIcon: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center", marginRight: 9,
  },
  infoChipLabel: { fontSize: 10.5, color: "#94A3B8", marginBottom: 1 },
  infoChipValue: { fontSize: 13, fontWeight: "700", color: "#0F172A" },

  // Price card
  priceCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#fff", padding: 16, borderRadius: 14,
    borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 18,
  },
  priceCardLabel: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  priceCardNote: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
  priceCardValue: { fontSize: 30, fontWeight: "700", color: "#059669" },

  // Sample
  sampleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 18,
  },
  sampleBtnLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sampleIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  sampleBtnTitle: { fontSize: 14, fontWeight: "600", color: "#0F172A" },
  sampleBtnSub: { fontSize: 11.5, color: "#94A3B8", marginTop: 1 },

  // Description
  descSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", marginBottom: 10 },

  // Trust strip
  trustStrip: {
    flexDirection: "row", justifyContent: "space-around",
    backgroundColor: "#fff", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 8,
  },
  trustItem: { alignItems: "center", gap: 6, flex: 1 },
  trustIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  trustLabel: { fontSize: 10, color: "#64748B", fontWeight: "500", textAlign: "center", lineHeight: 13 },

  // ── Bottom Action Bar ──
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  bottomRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  bottomPriceTag: {
    backgroundColor: "#EEF2FF", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
  },
  bottomPriceLabel: { fontSize: 16, fontWeight: "700", color: "#4338CA" },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: 14, backgroundColor: "#ef4444",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  outlineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: "#ef4444", backgroundColor: "#fff",
  },
  outlineBtnText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },

  noFileBar: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#EEF2FF", padding: 14, borderRadius: 12,
  },
  noFileText: { flex: 1, fontSize: 12.5, color: "#4338CA", lineHeight: 18 },

  // ── Payment Result Modal ──
  resultOverlay: {
    flex: 1, backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center", alignItems: "center", padding: 24,
  },
  resultCard: {
    backgroundColor: "#fff", borderRadius: 24, padding: 28,
    alignItems: "center", width: "100%", maxWidth: 340,
  },
  resultIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  resultTitle: { fontSize: 20, fontWeight: "700", color: "#0F172A", marginBottom: 10, textAlign: "center" },
  resultMessage: {
    fontSize: 14, color: "#64748B", lineHeight: 21,
    textAlign: "center", marginBottom: 24,
  },
  resultPrimaryBtn: {
    width: "100%", paddingVertical: 15, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  resultPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  resultSecondaryBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  resultSecondaryText: { color: "#64748B", fontSize: 14, fontWeight: "500" },

  // ── Hardcopy Modal ──
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 28, maxHeight: "93%",
  },
  sheetHandle: {
    width: 42, height: 5, borderRadius: 3, backgroundColor: "#CBD5E1",
    alignSelf: "center", marginBottom: 18,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 },
  modalHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  modalHeaderIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: "#EEF2FF",
    alignItems: "center", justifyContent: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  modalSubtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center",
  },

  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 7 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#F8FAFC", borderRadius: 12,
    borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 14.5, color: "#0F172A", paddingVertical: 13 },
  shippingNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#EEF2FF", padding: 12, borderRadius: 10, marginBottom: 4,
  },
  shippingNoteText: { flex: 1, fontSize: 12.5, color: "#4338CA", lineHeight: 18 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, backgroundColor: "#ef4444", paddingVertical: 15, borderRadius: 14, marginTop: 16,
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});