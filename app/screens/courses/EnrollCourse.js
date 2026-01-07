import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native";
import useSWR from "swr";
import RazorpayCheckout from "react-native-razorpay";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../stores/auth.store";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import axios from "axios";

const { fetcher } = require("../../constant/fetcher");

const colors = {
  primary: "#DC2626",
  secondary: "#1F2937",
  background: "#FFFFFF",
  surface: "#FAFAFA",
  text: "#111827",
  textSecondary: "#6B7280",
  textLight: "#9CA3AF",
  success: "#10B981",
  danger: "#DC2626",
  warning: "#F59E0B",
  border: "#E5E7EB",
  lightRed: "#FEF2F2",
  lightGreen: "#F0FDF4",
  darkRed: "#991B1B",
  white: "#FFFFFF",
};

export default function EnrollCourse() {
  const route = useRoute();
  const navigation = useNavigation();
  const { batchId } = route.params || {};
  const { user, token } = useAuthStore();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed'
  const [paymentMessage, setPaymentMessage] = useState("");
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  // Fetch batch details
  const { data: batchData, isLoading: batchLoading } = useSWR(
    batchId ? `/batchs/${batchId}` : null,
    fetcher
  );

  // Fetch available coupons
  const { data: couponsData, isLoading: couponsLoading } = useSWR(
    `/coupons`,
    fetcher
  );

  const coupons = couponsData || [];

  // Filter valid and active coupons
  const validCoupons = coupons.filter(
    (coupon) => coupon.isActive && new Date(coupon.validTill) > new Date()
  );

  // console.log("batchData",batchData)

  // Calculate pricing
  const originalPrice =
    batchData?.batchDiscountPrice || batchData?.batchPrice || 0;
  const subtotal = originalPrice;

  const discount = appliedCoupon
    ? appliedCoupon.discountType === "flat"
      ? appliedCoupon.discount
      : Math.min(
          (subtotal * appliedCoupon.discount) / 100,
          appliedCoupon.maxDiscount || Infinity
        )
    : 0;

  const totalAmount = Math.round(subtotal - discount);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  // Apply Coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplying(true);
    triggerHaptic();

    const coupon = validCoupons.find(
      (c) => c.code.toLowerCase() === couponCode.trim().toLowerCase()
    );

    if (!coupon) {
      showPaymentResult("failed", "Invalid coupon code or expired");
      setIsApplying(false);
      return;
    }

    if (subtotal < (coupon.minPurchase || 0)) {
      showPaymentResult(
        "failed",
        `Minimum purchase of ₹${coupon.minPurchase} required`
      );
      setIsApplying(false);
      return;
    }

    setAppliedCoupon(coupon);
    setIsApplying(false);
    showPaymentResult(
      "success",
      `Coupon ${coupon.code} applied! Save ₹${Math.round(discount)}`
    );
  };

  // Remove Coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    triggerHaptic();
  };

  // Show payment result modal
  const showPaymentResult = (status, message) => {
    setPaymentStatus(status);
    setPaymentMessage(message);
    setShowPaymentModal(true);
  };

  // Create Razorpay Order & Pay
const initiatePayment = async () => {
  if (paymentLoading) {
    console.log("⏳ Payment already in progress");
    return;
  }

  console.log("🚀 Initiating payment...");
  setPaymentLoading(true);

  try {
    if (!token) {
      console.error("❌ Token missing");
      showPaymentResult("failed", "User token missing. Please login again.");
      setPaymentLoading(false);
      return;
    }

    console.log("📦 Creating order with payload:", {
      userId: user.id,
      type: "batch",
      itemId: batchId,
      amount: subtotal,
      gst: 0,
      couponCode: appliedCoupon?.code || null,
    });

    const orderResponse = await axios.post(
      `${API_URL_LOCAL_ENDPOINT}/orders`,
      {
        userId: user.id,
        type: "batch",
        itemId: batchId,
        amount: subtotal,
        gst: 0,
        couponCode: appliedCoupon?.code || null,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("✅ Order API response:", orderResponse.data);

    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message || "Failed to create order");
    }

    const { razorOrder, key } = orderResponse.data;

    console.log("🧾 Razorpay order created:", razorOrder);

    const options = {
      description: `Enrollment for ${batchData?.name}`,
      image:
        "https://www.dikshantias.com/_next/image?url=https%3A%2F%2Fdikshantiasnew-web.s3.ap-south-1.amazonaws.com%2Fweb%2F1757750048833-e5243743-d7ec-40f6-950d-849cd31d525f-dikshant-logo.png&w=384&q=75",
      currency: "INR",
      key: key || "rzp_live_S0aOl8Cd5iz5jk",
      amount: razorOrder.amount,
      name: "Dikshant IAS",
      order_id: razorOrder.id,
      theme: { color: colors.primary },
      prefill: {
        name: user?.name,
        email: user?.email,
        contact: user?.mobile,
      },
    };

    console.log("💳 Opening Razorpay with options:", options);

    RazorpayCheckout.open(options)
      .then(async (data) => {
        console.log("✅ Razorpay success callback:", data);

        try {
          console.log("🔐 Verifying payment with backend...");

          const res = await axios.post(
            `${API_URL_LOCAL_ENDPOINT}/orders/verify`,
            {
              razorpayOrderId: data.razorpay_order_id,
              razorpayPaymentId: data.razorpay_payment_id,
              razorpaySignature: data.razorpay_signature,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("✅ Payment verification response:", res.data);

          const { order, relatedId } = res.data;
          const courseId = order.itemId || relatedId;

          console.log("🎓 Enrollment success, courseId:", courseId);

          showPaymentResult(
            "success",
            "Payment successful! You are now enrolled in the course."
          );
          setTimeout(()=>{
                navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                { name: "Home" },
                {
                  name: "my-course",
                  params: {
                    unlocked: true,
                    courseId,
                  },
                },
              ],
            })
          );
          },2000)
      
        } catch (verifyErr) {
          console.error("❌ Payment verification failed:", verifyErr);
          showPaymentResult(
            "failed",
            "Payment verification failed. Please contact support."
          );
        }
      })
      .catch((error) => {
        console.error("❌ Razorpay payment failed:", error);
        showPaymentResult(
          "failed",
          error?.description?.error?.description ||
            "Payment failed. Please try again."
        );
      })
      .finally(() => {
        console.log("🔚 Razorpay flow ended");
        setPaymentLoading(false);
      });

  } catch (error) {
    console.error("❌ initiatePayment error:", error);
    showPaymentResult(
      "failed",
      error.message || "Payment failed. Please try again."
    );
    setPaymentLoading(false);
  }
};

  const selectCoupon = (coupon) => {
    setCouponCode(coupon.code);
    setShowCouponsModal(false);
    triggerHaptic();
  };

  if (batchLoading || couponsLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Preparing your enrollment...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={20} color={colors.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Complete Enrollment</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Course Summary */}
          <View style={styles.courseCard}>
            <View style={styles.courseIcon}>
              <Feather name="book-open" size={16} color={colors.primary} />
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseName}>{batchData?.name}</Text>
              <Text style={styles.courseSubtitle}>
                {batchData?.shortDescription}
              </Text>
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceCard}>
            <Text style={styles.sectionTitle}>Price Details</Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Course Fee</Text>
              <Text style={styles.priceValue}>
                ₹{subtotal.toLocaleString("en-IN")}
              </Text>
            </View>

            {appliedCoupon && (
              <View style={styles.discountRow}>
                <View style={styles.discountInfo}>
                  <Feather name="tag" size={12} color={colors.success} />
                  <Text style={styles.discountLabel}>
                    {appliedCoupon.code} Applied
                  </Text>
                </View>
                <Text style={styles.discountValue}>
                  - ₹{Math.round(discount)}
                </Text>
              </View>
            )}

            {/* <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>GST (18%)</Text>
              <Text style={styles.priceValue}>+ ₹{gstAmount.toLocaleString("en-IN")}</Text>
            </View> */}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                ₹{totalAmount.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          {/* Coupon Section */}
          <View style={styles.couponCard}>
            <View style={styles.couponHeader}>
              <Text style={styles.sectionTitle}>Apply Coupon</Text>
              {validCoupons.length > 0 && (
                <TouchableOpacity
                  style={styles.viewCouponsBtn}
                  onPress={() => setShowCouponsModal(true)}
                >
                  <Text style={styles.viewCouponsText}>View Available</Text>
                  <Feather
                    name="chevron-right"
                    size={12}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.couponInputContainer}>
              <TextInput
                style={[
                  styles.couponInput,
                  appliedCoupon && styles.couponInputDisabled,
                ]}
                placeholder="Enter coupon code"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
                editable={!appliedCoupon}
                placeholderTextColor={colors.textLight}
              />
              {appliedCoupon ? (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={removeCoupon}
                >
                  <Feather name="x" size={16} color={colors.danger} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.applyBtn,
                    isApplying && styles.applyBtnDisabled,
                  ]}
                  onPress={applyCoupon}
                  disabled={isApplying}
                >
                  {isApplying ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.applyBtnText}>Apply</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {appliedCoupon && (
              <View style={styles.couponSuccessContainer}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={styles.couponSuccess}>
                  Coupon applied! You saved ₹{Math.round(discount)}
                </Text>
              </View>
            )}
          </View>

          {/* Quick Coupon Chips */}
          {validCoupons.length > 0 && !appliedCoupon && (
            <View style={styles.quickCoupons}>
              <Text style={styles.quickCouponsTitle}>Quick Apply:</Text>
              <View style={styles.couponChipsContainer}>
                {validCoupons.slice(0, 3).map((coupon) => (
                  <TouchableOpacity
                    key={coupon.id}
                    onPress={() => selectCoupon(coupon)}
                    style={styles.couponChip}
                  >
                    <Text style={styles.couponChipText}>{coupon.code}</Text>
                    <Text style={styles.couponChipDiscount}>
                      {coupon.discountType === "flat"
                        ? `₹${coupon.discount} OFF`
                        : `${coupon.discount}% OFF`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Pay Button */}
        <View style={styles.bottomBar}>
          <View style={styles.finalAmountContainer}>
            <Text style={styles.finalAmountLabel}>You Pay</Text>
            <Text style={styles.finalAmount}>
              ₹{totalAmount.toLocaleString("en-IN")}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.payButton,
              paymentLoading && styles.payButtonDisabled,
            ]}
            onPress={initiatePayment}
            disabled={paymentLoading}
          >
            {paymentLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.payButtonText}>Pay Securely</Text>
                <Feather name="shield" size={16} color={colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Payment Result Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View
              style={[
                styles.paymentModalIcon,
                paymentStatus === "success"
                  ? styles.successIcon
                  : styles.errorIcon,
              ]}
            >
              <Feather
                name={paymentStatus === "success" ? "check" : "x"}
                size={32}
                color={colors.white}
              />
            </View>

            <Text style={styles.paymentModalTitle}>
              {paymentStatus === "success" ? "Success!" : "Payment Failed"}
            </Text>

            <Text style={styles.paymentModalMessage}>{paymentMessage}</Text>

            <View style={styles.paymentModalButtons}>
              {paymentStatus === "success" ? (
                <>
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={() => {
                      setShowPaymentModal(false);
                      //   navigation.goBack();
                    }}
                  >
                    <Text style={styles.modalSecondaryButtonText}>
                      Continue
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.modalPrimaryButton}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.modalPrimaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Available Coupons Modal */}
      <Modal
        visible={showCouponsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCouponsModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCouponsModal(false)}
        >
          <Pressable
            style={styles.couponsModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />

            <View style={styles.couponsModalHeader}>
              <Text style={styles.couponsModalTitle}>Available Coupons</Text>
              <TouchableOpacity onPress={() => setShowCouponsModal(false)}>
                <Feather name="x" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.couponsModalScroll}>
              {validCoupons.map((coupon) => (
                <TouchableOpacity
                  key={coupon.id}
                  style={styles.couponModalItem}
                  onPress={() => selectCoupon(coupon)}
                >
                  <View style={styles.couponModalLeft}>
                    <View style={styles.couponModalTag}>
                      <Feather name="tag" size={14} color={colors.primary} />
                    </View>
                    <View style={styles.couponModalInfo}>
                      <Text style={styles.couponModalCode}>{coupon.code}</Text>
                      <Text style={styles.couponModalDesc}>
                        {coupon.discountType === "flat"
                          ? `Get ₹${coupon.discount} off`
                          : `Get ${coupon.discount}% off (max ₹${coupon.maxDiscount})`}
                      </Text>
                      {coupon.minPurchase > 0 && (
                        <Text style={styles.couponModalMin}>
                          Min purchase: ₹{coupon.minPurchase}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.textLight}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  courseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightRed,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 12,
  },
  courseIcon: {
    width: 36,
    height: 36,
    backgroundColor: colors.white,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  courseSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  priceCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  discountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  discountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  discountLabel: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  discountValue: {
    fontSize: 13,
    color: colors.success,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  couponCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  couponHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewCouponsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewCouponsText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
  },
  couponInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: colors.white,
    color: colors.text,
  },
  couponInputDisabled: {
    backgroundColor: colors.surface,
    color: colors.textSecondary,
  },
  applyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyBtnDisabled: {
    opacity: 0.6,
  },
  applyBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 12,
  },
  removeBtn: {
    padding: 10,
  },
  couponSuccessContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  couponSuccess: {
    color: colors.success,
    fontWeight: "500",
    fontSize: 11,
  },
  quickCoupons: {
    marginBottom: 16,
  },
  quickCouponsTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: "500",
  },
  couponChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  couponChip: {
    backgroundColor: colors.lightRed,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
  },
  couponChipText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 10,
  },
  couponChipDiscount: {
    color: colors.primary,
    fontSize: 8,
    marginTop: 1,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  finalAmountContainer: {
    flex: 1,
  },
  finalAmountLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  finalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  payButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.7,
  },
  payButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 32,
    maxWidth: 320,
  },
  paymentModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIcon: {
    backgroundColor: colors.success,
  },
  errorIcon: {
    backgroundColor: colors.danger,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  paymentModalMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  paymentModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalPrimaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalPrimaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  modalSecondaryButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  couponsModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: "70%",
    marginTop: "auto",
  },
  modalHandle: {
    width: 32,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  couponsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  couponsModalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  couponsModalScroll: {
    flex: 1,
  },
  couponModalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  couponModalLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  couponModalTag: {
    width: 32,
    height: 32,
    backgroundColor: colors.lightRed,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  couponModalInfo: {
    flex: 1,
  },
  couponModalCode: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 2,
  },
  couponModalDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  couponModalMin: {
    fontSize: 10,
    color: colors.textLight,
  },
});
