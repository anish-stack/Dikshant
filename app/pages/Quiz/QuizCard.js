import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuthStore } from "../../stores/auth.store";
import { LOCAL_ENDPOINT } from "../../constant/api";
import { Ionicons } from "@expo/vector-icons";

export default function QuizCard({ onPress, isRefresh, item, setIsPurchased }) {
    const { token } = useAuthStore();

    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const [canAttempt, setCanAttempt] = useState(true);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loadingPurchaseStatus, setLoadingPurchaseStatus] = useState(true);

    // Check purchase / subscription status
    const checkPurchaseStatus = async () => {
        if (!token || item.isFree || item?.is_free) {
            setLoadingPurchaseStatus(false);
            return;
        }

        try {
            setLoadingPurchaseStatus(true);
            const response = await axios.get(
                `${LOCAL_ENDPOINT}/orders/already-purchased`,
                {
                    params: { type: "quiz", itemId: item?.id },
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            const { purchased = false, remainingAttempts = null, canAttempt = true } =
                response.data || {};

            setIsSubscribed(purchased);
            setIsPurchased?.(purchased); // safe call
            setRemainingAttempts(remainingAttempts);
            setCanAttempt(canAttempt);
        } catch (error) {
            console.error("Error checking purchase status:", error);
            setIsSubscribed(false);
        } finally {
            setLoadingPurchaseStatus(false);
        }
    };

    useEffect(() => {
        checkPurchaseStatus();
    }, [item?.id, token, isRefresh]);

    const handlePress = () => {
        if (onPress) {
            onPress({ ...item, isSubscribed });
        }
    };

    // ─── Badge Logic ────────────────────────────────────────────────────────────
    const getMainBadge = () => {
        // Free
        if (item.isFree || item?.is_free) {
            return (
                <View style={[styles.badgeContent, styles.freeBadge]}>
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                    <Text style={styles.freeText}>Free</Text>
                </View>
            );
        }

        // Not subscribed → Premium lock
        if (!isSubscribed) {
            return (
                <View style={[styles.badgeContent, styles.premiumBadge]}>
                    <Ionicons name="lock-closed" size={12} color="#B11226" />
                    <Text style={styles.premiumText}>Premium</Text>
                </View>
            );
        }

        // Subscribed cases
        if (remainingAttempts === 0 || canAttempt === false) {
            return (
                <View style={[styles.badgeContent, styles.limitBadge]}>
                    <Ionicons name="alert-circle" size={12} color="#D97706" />
                    <Text style={styles.limitText}>Limit Reached</Text>
                </View>
            );
        }

        if (remainingAttempts !== null && remainingAttempts >= 0) {
            return (
                <View style={[styles.badgeContent, styles.attemptsBadge]}>
                    <Ionicons name="timer-outline" size={12} color="#059669" />
                    <Text style={styles.attemptsText}>{remainingAttempts} left</Text>
                </View>
            );
        }

        // Default subscribed (unlimited or no limit info)
        return (
            <View style={[styles.badgeContent, styles.subscribedBadge]}>
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text style={styles.subscribedText}>Unlocked</Text>
            </View>
        );
    };

    const renderFloatingUnlockedBadge = () => {
        if (!isSubscribed || loadingPurchaseStatus) {
            return null;
        }

        const hasValidAttempts =
            remainingAttempts !== null &&
            remainingAttempts > 0 &&
            canAttempt === true;

        if (!hasValidAttempts) {
            return null;
        }
        return (
            <View style={styles.floatingBadge}>
                <View style={[styles.badgeContent, styles.subscribedBadge]}>
                    <Ionicons name="checkmark-circle" size={13} color="#059669" />
                    <Text style={styles.subscribedText}>Unlocked</Text>
                </View>
            </View>
        );
    };
    
    const isDisabled = loadingPurchaseStatus || (!canAttempt && isSubscribed);

    return (
        <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.card, isDisabled && styles.disabledCard]}
            onPress={handlePress}
            disabled={isDisabled || loadingPurchaseStatus}
        >
            {/* Image + Floating Badge */}
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.image || "https://i.ibb.co/5WvN9fMJ/image.png" }}
                    style={styles.quizImage}
                    resizeMethod="resize"
                    resizeMode="cover"
                />
                <View style={styles.imageOverlay} />

                {/* Floating Unlocked badge - top right */}
                {renderFloatingUnlockedBadge()}
            </View>

            {/* Content */}
            <View style={styles.contentWrapper}>
                {/* Title + Attempt/Limit badge */}
                <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.title || "Polity – Fundamental Rights"}
                    </Text>

                    {/* Shows remaining attempts or limit reached when applicable */}
                    {isSubscribed && (remainingAttempts !== null || !canAttempt) && (
                        <View style={styles.badge}>{getMainBadge()}</View>
                    )}

                    {/* For free / not-subscribed → show in title row */}
                    {(!isSubscribed || item.isFree || item?.is_free) && (
                        <View style={styles.badge}>{getMainBadge()}</View>
                    )}
                </View>

                <Text style={styles.description} numberOfLines={2}>
                    {item.description || "Important UPSC-oriented questions..."}
                </Text>

                <View style={styles.metaContainer}>
                    <View style={styles.metaItem}>
                        <Ionicons name="help-circle-outline" size={16} color="#6B7280" />
                        <Text style={styles.metaText}>{item.totalQuestions || 20}</Text>
                    </View>

                    <View style={styles.metaDivider} />

                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color="#6B7280" />
                        <Text style={styles.metaText}>
                            {item.durationMinutes || item.duration || 15} min
                        </Text>
                    </View>

                    {!(item.isFree || item?.is_free) && (
                        <>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
                                <Text style={styles.metaText}>₹{item?.price || 0}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.bottomRow}>
                    <View style={styles.levelTag}>
                        <Text style={styles.levelText}>{item.level || "Beginner"}</Text>
                    </View>

                    {!canAttempt && isSubscribed && (
                        <Text style={styles.disabledHint}>Try again tomorrow</Text>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },
    disabledCard: { opacity: 0.55 },

    imageContainer: {
        width: "100%",
        aspectRatio: 16 / 9.5,
        backgroundColor: "#F3F4F6",
        position: "relative",
    },
    quizImage: {
        width: "100%",
        height: "100%",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    imageOverlay: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        backgroundColor: "rgba(0,0,0,0.08)",
    },

    // ─── Floating badge (top-right corner of image) ───────────────────────────
    floatingBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 10,
    },

    contentWrapper: { padding: 16 },

    titleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 8,
        gap: 10,
    },
    title: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
        lineHeight: 24,
    },

    badge: {
        flexShrink: 0,
    },
    badgeContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },

    freeBadge: { backgroundColor: "#D1FAE5" },
    freeText: { fontSize: 11, fontWeight: "700", color: "#059669" },

    premiumBadge: { backgroundColor: "#FEE2E2" },
    premiumText: { fontSize: 11, fontWeight: "700", color: "#B11226" },

    subscribedBadge: { backgroundColor: "#D1FAE5" },
    subscribedText: { fontSize: 11, fontWeight: "700", color: "#059669" },

    attemptsBadge: { backgroundColor: "#DBEAFE" },
    attemptsText: { fontSize: 11, fontWeight: "700", color: "#1D4ED8" },

    limitBadge: { backgroundColor: "#FEF3C7" },
    limitText: { fontSize: 11, fontWeight: "700", color: "#D97706" },

    description: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
        marginBottom: 12,
    },

    metaContainer: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        marginBottom: 12,
        gap: 16,
    },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    metaDivider: { width: 1, height: 14, backgroundColor: "#D1D5DB" },

    bottomRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    levelTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: "#EEF2FF",
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    levelText: { fontSize: 12, fontWeight: "600", color: "#4F46E5" },

    disabledHint: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
});