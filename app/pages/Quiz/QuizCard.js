import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuthStore } from "../../stores/auth.store";
import { API_URL_LOCAL_ENDPOINT, LOCAL_ENDPOINT } from "../../constant/api";

export default function QuizCard({ onPress, isRefresh, item, setIsPurchased }) {
    const { token } = useAuthStore();

    const [remainingAttempts, setRemainingAttempts] = useState(null);
    const [canAttempt, setCanAttempt] = useState(true);

    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loadingPurchaseStatus, setLoadingPurchaseStatus] = useState(true);

    // Check if quiz is already purchased
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
                    params: {
                        type: "quiz",
                        itemId: item?.id,
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const {
                purchased = false,
                remainingAttempts = null,
                canAttempt = true,
            } = response.data || {};

            setIsSubscribed(purchased);
            setIsPurchased(purchased);
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

    // Handle card press - pass isSubscribed info
    const handlePress = () => {
        if (onPress) {
            onPress({
                ...item,
                isSubscribed, // extra info for details screen
            });
        }
    };

    const getBadge = () => {
        if (item.isFree || item?.is_free) {
            return (
                <View style={styles.freeTag}>
                    <Text style={styles.freeText}>Free</Text>
                </View>
            );
        }

        if (isSubscribed) {
            if (remainingAttempts === 0 || canAttempt === false) {
                return (
                    <View style={styles.limitTag}>
                        <Text style={styles.limitText}>Limit Reached</Text>
                    </View>
                );
            }

            if (remainingAttempts !== null) {
                return (
                    <View style={styles.subscribedTag}>
                        <Text style={styles.subscribedText}>
                            {remainingAttempts} left
                        </Text>
                    </View>
                );
            }

            return (
                <View style={styles.subscribedTag}>
                    <Text style={styles.subscribedText}>Subscribed</Text>
                </View>
            );
        }

        return (
            <View style={styles.premiumTag}>
                <Text style={styles.premiumText}>Premium</Text>
            </View>
        );
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            style={[
                styles.card,
                !canAttempt && isSubscribed && styles.disabledCard,
            ]}
            onPress={handlePress}
            disabled={loadingPurchaseStatus || (!canAttempt && isSubscribed)}
        >
            {/* Left Icon */}
            <View style={styles.iconContainer}>
                <Image
                    source={{ uri: item.image || "https://via.placeholder.com/80" }}
                    style={styles.icon}
                />
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={1}>
                    {item.title || "Polity – Fundamental Rights"}
                </Text>

                <Text style={styles.description} numberOfLines={2}>
                    {item.description ||
                        "Important UPSC-oriented questions for focused practice."}
                </Text>

                {/* Meta Info */}
                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                        {item.totalQuestions || 20} Questions
                    </Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>
                        {item.durationMinutes || item.duration || 15} Min
                    </Text>
                    {item.isFree || !item?.is_free && (
                        <>
                            <Text style={styles.metaDot}>•</Text>
                            <Text style={styles.metaText}>₹ {item?.price || 0}</Text>
                        </>
                    )}
                </View>

                {/* Tags */}
                <View style={styles.tagRow}>
                    <View style={styles.levelTag}>
                        <Text style={styles.levelText}>
                            {item.level || "Beginner"}
                        </Text>
                    </View>

                    {getBadge()}
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },

    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },

    icon: {
        width: 44,
        height: 44,
        resizeMode: "contain",
    },

    content: {
        flex: 1,
    },

    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 4,
    },

    description: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
        marginBottom: 8,
    },

    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
    },

    metaText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#4B5563",
    },

    metaDot: {
        marginHorizontal: 8,
        fontSize: 14,
        color: "#9CA3AF",
    },

    tagRow: {
        flexDirection: "row",
        marginTop: 10,
        gap: 10,
    },

    levelTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
    },

    levelText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#374151",
    },

    freeTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#DCFCE7",
    },

    freeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#166534",
    },

    premiumTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#FEE2E2",
    },

    premiumText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#B11226",
    },

    subscribedTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#D1FAE5",
    },
    disabledCard: {
        opacity: 0.5,
    },

    limitTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: "#FEF3C7",
    },
    limitText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#92400E",
    },

    subscribedText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#059669",
    },
});