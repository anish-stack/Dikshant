import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";

export default function SubjectBatchCard({
    subject,
    subjectInfo,
    isBatchPurchased,
    purchasedSubjectIds,
    loading,
    onPurchase,
}) {
    const isPurchased = purchasedSubjectIds.includes(subject?.id);

    const disabled = isBatchPurchased || isPurchased || loading;

    const finalPrice = subjectInfo.discountPrice > 0
        ? subjectInfo.discountPrice
        : subjectInfo.price;

    const hasDiscount = subjectInfo.discountPrice > 0 && subjectInfo.discountPrice < subjectInfo.price;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.subjectName}>{subject?.name}</Text>


            </View>
            {subjectInfo.tag && (
                <View style={styles.tag}>
                    <Text style={styles.tagText}>{subjectInfo.tag}</Text>
                </View>
            )}
            {/* Price */}
            <View style={styles.priceContainer}>
                {hasDiscount && (
                    <Text style={styles.originalPrice}>₹{subjectInfo.price}</Text>
                )}
                <Text style={styles.finalPrice}>₹{finalPrice}</Text>
            </View>

            {/* Expiry */}
            <Text style={styles.expiry}>
                Access for {subjectInfo.expiryDays} days
            </Text>

            {/* Action Area */}
            {isBatchPurchased ? (
                <View style={styles.batchIncluded}>
                    <Text style={styles.batchIncludedText}>Included in Batch</Text>
                </View>
            ) : isPurchased ? (
                <View style={styles.purchased}>
                    <Text style={styles.purchasedText}>Already Purchased</Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={[styles.buyButton, disabled && styles.disabledButton]}
                    disabled={disabled}
                    onPress={() => onPurchase(subject?.id)}
                    activeOpacity={0.85}
                >
                    {loading ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                        <Text style={styles.buyButtonText}>Buy Subject</Text>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#f3f4f6",
    },

    header: {
        position: "relative",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },

    subjectName: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111827",
        flex: 1,
        lineHeight: 20,
    },
    tag: {
        backgroundColor: "#f3e8ff",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: "flex-start",     // Important: takes only required width
    },

    tagText: {
        color: "#7c3aed",
        fontSize: 11,
        fontWeight: "700",
    },

    priceContainer: {
        flexDirection: "row",
        alignItems: "baseline",
        marginVertical: 6,
    },

    originalPrice: {
        fontSize: 13,
        color: "#9ca3af",
        textDecorationLine: "line-through",
        marginRight: 6,
    },

    finalPrice: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
    },

    expiry: {
        fontSize: 12.5,
        color: "#6b7280",
        marginBottom: 14,
    },

    /* Buttons & Badges */
    buyButton: {
        backgroundColor: "#4f46e5",
        paddingVertical: 11,
        borderRadius: 10,
        alignItems: "center",
    },

    buyButtonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },

    disabledButton: {
        backgroundColor: "#9ca3af",
        opacity: 0.75,
    },

    purchased: {
        backgroundColor: "#f0fdf4",
        paddingVertical: 9,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#86efac",
    },

    purchasedText: {
        color: "#15803d",
        fontSize: 13.5,
        fontWeight: "600",
    },

    batchIncluded: {
        backgroundColor: "#f0f9ff",
        paddingVertical: 9,
        borderRadius: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#bae6fd",
    },

    batchIncludedText: {
        color: "#0e7490",
        fontSize: 13.5,
        fontWeight: "600",
    },
});