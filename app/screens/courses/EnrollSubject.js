import React, { useState, useEffect, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Modal,
    Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation, CommonActions } from "@react-navigation/native";
import RazorpayCheckout from "react-native-razorpay";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import axios from "axios";
import { useAuthStore } from "../../stores/auth.store";
import useSWR from "swr";
import api, { fetcher } from "../../constant/fetcher";
import Layout from "../../components/layout";


export default function EnrollSubject() {
    const route = useRoute();
    const navigation = useNavigation();
    const { token, user } = useAuthStore();

    const { subjectId, batchId } = route.params || {};

    // States
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'failed'
    const [paymentMessage, setPaymentMessage] = useState("");

    const [showCouponsModal, setShowCouponsModal] = useState(false);

    // Fetch Batch Data (including separatePurchaseSubjects)
    const { data: batchData, error: batchError, isLoading: batchLoading } = useSWR(
        subjectId ? `/batchs/student/${batchId}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Fetch Available Coupons
    const { data: couponsData } = useSWR("/coupons", fetcher);

    const coupons = couponsData || [];
    const validCoupons = coupons.filter(
        (c) => c.isActive && new Date(c.validTill) > new Date()
    );

    // Find selected subject info from separatePurchaseSubjects
    const selectedSubject = useMemo(() => {
        if (!batchData?.separatePurchaseSubjects || !subjectId) return null;
        return batchData.separatePurchaseSubjects.find(
            (s) => s.subjectId === parseInt(subjectId)
        );
    }, [batchData, subjectId]);
    console.log("selectedSubject", selectedSubject)

    const subjectName =
        batchData?.subjects?.find((i) => i.id === subjectId)?.name || "";
    // Calculate Price
    const originalPrice = selectedSubject?.price || 0;
    const discountPrice = selectedSubject?.discountPrice || 0;
    const finalPrice = discountPrice > 0 ? discountPrice : originalPrice;

    const discountAmount = appliedCoupon
        ? Math.round((finalPrice * (appliedCoupon.discountPercent || 0)) / 100)
        : 0;

    const subtotal = finalPrice - discountAmount;

    // Haptic Feedback
    const triggerHaptic = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            showPaymentResult("failed", "Invalid or expired coupon code");
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
        showPaymentResult("success", `Coupon applied! You save ₹${discountAmount}`);
    };

    // Remove Coupon
    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        triggerHaptic();
    };

    // Show Result Modal
    const showPaymentResult = (status, message) => {
        setPaymentStatus(status);
        setPaymentMessage(message);
        setShowPaymentModal(true);
    };

    // Initiate Razorpay Payment
    const initiatePayment = async () => {
        if (paymentLoading || !selectedSubject) return;

        setPaymentLoading(true);
        triggerHaptic();

        try {
            const payload = {
                userId: user?.id,
                type: "subject",
                batchId,
                accessValidityDays: selectedSubject?.expiryDays || 365,
                itemId: parseInt(subjectId),
                amount: subtotal,
                gst: 0,
                couponCode: appliedCoupon?.code || null,
            };

            const orderResponse = await api.post(
                `/orders`,
                payload
            );

            if (!orderResponse.data.success) {
                throw new Error(orderResponse.data.message || "Failed to create order");
            }

            const { razorOrder, key } = orderResponse.data;

            const options = {
                description: `Purchase: ${subjectName}`,
                image: "https://dikshantias.com/logo.png", // Replace with your logo
                currency: "INR",
                key: key || "rzp_live_S0aOl8Cd5iz5jk",
                amount: razorOrder.amount,
                name: "Dikshant IAS",
                order_id: razorOrder.id,
                theme: { color: "#4f46e5" },
                prefill: {
                    name: user?.name,
                    email: user?.email,
                    contact: user?.mobile,
                },
            };

            RazorpayCheckout.open(options)
                .then(async (data) => {
                    const verifyRes = await api.post(
                        `/orders/verify`,
                        {
                            razorpayOrderId: data.razorpay_order_id,
                            razorpayPaymentId: data.razorpay_payment_id,
                            razorpaySignature: data.razorpay_signature,
                        }

                    );
                    console.log(verifyRes.data)
                    showPaymentResult("success", "Payment Successful! Subject unlocked.");
                    const verifyData = verifyRes.data.order
                    const params =
                        verifyData.type === "subject"
                            ? {
                                unlocked: true,
                                type: verifyData.type,
                                orderId: verifyData.id,
                                batchIdOfSubject: verifyData.batchIdOfSubject,
                                purchasedItem: verifyData.itemId,
                                courseId: verifyData.batchIdOfSubject
                            }
                            : {
                                unlocked: true,
                                type: verifyData.type,
                                orderId: verifyData.id,
                                courseId: verifyData.itemId
                            };

                    setTimeout(() => {
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 1,
                                routes: [
                                    { name: "Home" },
                                    {
                                        name: "my-course-subjects", params
                                    },
                                ],
                            })
                        );
                    }, 1800);
                })
                .catch((error) => {
                    console.error("Razorpay Error:", error);
                    showPaymentResult("failed", error?.description || "Payment failed");
                })
                .finally(() => setPaymentLoading(false));
        } catch (error) {
            console.error("Payment Error:", error.response.data.message);
            showPaymentResult("failed", error.response.data.message || "Something went wrong");
            setPaymentLoading(false);
        }
    };

    if (batchLoading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text style={styles.loadingText}>Loading subject details...</Text>
            </SafeAreaView>
        );
    }

    if (!selectedSubject) {
        return (
            <SafeAreaView style={styles.center}>
                <Text style={styles.errorText}>Subject not found or not available for separate purchase.</Text>
            </SafeAreaView>
        );
    }

    return (
        <Layout isBottomBarShow={false}>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Subject Info */}
                <View style={styles.card}>
                    <Text style={styles.subjectTitle}>{subjectName}</Text>
                    <Text style={styles.subjectSubtitle}>Individual Subject Purchase</Text>

                    <View style={styles.priceSection}>
                        {discountPrice > 0 && (
                            <Text style={styles.originalPrice}>₹{originalPrice}</Text>
                        )}
                        <Text style={styles.finalPrice}>₹{finalPrice}</Text>
                    </View>

                    <Text style={styles.expiry}>
                        Access for {selectedSubject.expiryDays} days
                    </Text>
                </View>

                {/* Coupon Section */}
                <View style={styles.couponSection}>
                    <Text style={styles.sectionTitle}>Have a coupon?</Text>

                    <View style={styles.couponInputRow}>
                        <TextInput
                            style={styles.couponInput}
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChangeText={setCouponCode}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.applyButton}
                            onPress={applyCoupon}
                            disabled={isApplying || !couponCode.trim()}
                        >
                            {isApplying ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.applyButtonText}>Apply</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {appliedCoupon && (
                        <View style={styles.appliedCoupon}>
                            <Text style={styles.appliedText}>
                                {appliedCoupon.code} applied • Save ₹{discountAmount}
                            </Text>
                            <TouchableOpacity onPress={removeCoupon}>
                                <Feather name="x" size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                    <Text style={styles.totalLabel}>Total Payable</Text>
                    <Text style={styles.totalAmount}>₹{subtotal}</Text>
                </View>

                {/* Pay Button */}
                <TouchableOpacity
                    style={[styles.payButton, paymentLoading && styles.payButtonDisabled]}
                    onPress={initiatePayment}
                    disabled={paymentLoading}
                >
                    {paymentLoading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payButtonText}>Pay ₹{subtotal} and Enroll</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Payment Result Modal */}
            <Modal visible={showPaymentModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {paymentStatus === "success" ? (
                            <Feather name="check-circle" size={60} color="#10b981" />
                        ) : (
                            <Feather name="x-circle" size={60} color="#ef4444" />
                        )}

                        <Text style={styles.modalTitle}>
                            {paymentStatus === "success" ? "Payment Successful" : "Payment Failed"}
                        </Text>
                        <Text style={styles.modalMessage}>{paymentMessage}</Text>

                        <Pressable
                            style={styles.modalButton}
                            onPress={() => {
                                setShowPaymentModal(false);
                                if (paymentStatus === "success") {
                                    navigation.goBack();
                                }
                            }}
                        >
                            <Text style={styles.modalButtonText}>OK</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

        </Layout>

    );
}

// Styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f8fafc" },
    scrollContent: { padding: 16, paddingBottom: 100 },

    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },

    subjectTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1f2937",
        marginBottom: 4,
    },

    subjectSubtitle: {
        fontSize: 13,
        color: "#6b7280",
        marginBottom: 16,
    },

    priceSection: {
        flexDirection: "row",
        alignItems: "baseline",
        marginVertical: 8,
    },

    originalPrice: {
        fontSize: 15,
        color: "#9ca3af",
        textDecorationLine: "line-through",
        marginRight: 8,
    },

    finalPrice: {
        fontSize: 24,
        fontWeight: "800",
        color: "#111827",
    },

    expiry: {
        fontSize: 14,
        color: "#6b7280",
    },

    couponSection: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 12,
    },

    couponInputRow: {
        flexDirection: "row",
        gap: 10,
    },

    couponInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#d1d5db",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
    },

    applyButton: {
        backgroundColor: "#4f46e5",
        paddingHorizontal: 20,
        borderRadius: 10,
        justifyContent: "center",
    },

    applyButtonText: {
        color: "#fff",
        fontWeight: "600",
    },

    appliedCoupon: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 12,
        padding: 12,
        backgroundColor: "#f0fdf4",
        borderRadius: 10,
    },

    appliedText: {
        color: "#15803d",
        fontWeight: "600",
    },

    totalSection: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },

    totalLabel: {
        fontSize: 16,
        color: "#6b7280",
    },

    totalAmount: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
    },

    payButton: {
        backgroundColor: "#4f46e5",
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: "center",
    },

    payButtonText: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
    },

    payButtonDisabled: {
        opacity: 0.7,
    },

    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },

    loadingText: { marginTop: 12, color: "#6b7280" },
    errorText: { color: "#ef4444", textAlign: "center", padding: 20 },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },

    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 30,
        width: "85%",
        alignItems: "center",
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        marginVertical: 12,
        textAlign: "center",
    },

    modalMessage: {
        fontSize: 15,
        color: "#6b7280",
        textAlign: "center",
        marginBottom: 24,
    },

    modalButton: {
        backgroundColor: "#4f46e5",
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 12,
    },

    modalButtonText: {
        color: "#fff",
        fontWeight: "600",
        fontSize: 16,
    },
});