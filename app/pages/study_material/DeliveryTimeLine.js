import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import api from "../../constant/fetcher";

export default function DeliveryTimeLine({ route, navigation }) {
    const { purchaseId } = route.params || {};
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (purchaseId) {
            fetchDeliveryStatus();
        } else {
            Alert.alert("Error", "Purchase ID not found");
            navigation.goBack();
        }
    }, [purchaseId]);

    const fetchDeliveryStatus = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/study-materials/delivery-status/${purchaseId}`);

            if (res.data.success) {
                // Sort by createdAt (oldest first)
                const sortedData = [...res.data.data].sort(
                    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
                );
                setTimeline(sortedData);
            } else {
                setError("Failed to load delivery status");
            }
        } catch (err) {
            console.log(err);
            setError("Something went wrong while fetching timeline");
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status.toLowerCase()) {
            case "confirmed":
                return "check-circle";
            case "processing":
                return "package-variant";
            case "dispatched":
            case "shipped":
                return "truck-delivery";
            case "delivered":
                return "package-check";
            default:
                return "circle";
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case "delivered":
                return "#10B981"; // Green
            case "shipped":
            case "dispatched":
                return "#3B82F6"; // Blue
            case "processing":
                return "#F59E0B"; // Orange
            case "confirmed":
                return "#6366F1"; // Indigo
            default:
                return "#64748B";
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading delivery timeline...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={styles.centered}>
                <Icon name="alert-circle-outline" size={60} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <Text
                    style={styles.retryText}
                    onPress={fetchDeliveryStatus}
                >
                    Retry
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name="arrow-left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Delivery Timeline</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {timeline.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Icon name="truck-fast-outline" size={70} color="#E2E8F0" />
                        <Text style={styles.emptyText}>No delivery updates yet</Text>
                    </View>
                ) : (
                    <View style={styles.timelineContainer}>
                        {timeline.map((item, index) => {
                            const isLast = index === timeline.length - 1;
                            const isDelivered = item.status.toLowerCase() === "delivered";

                            return (
                                <View key={item.id} style={styles.timelineItem}>
                                    {/* Vertical Line */}
                                    {!isLast && <View style={styles.verticalLine} />}

                                    <View style={styles.timelineContent}>
                                        {/* Status Icon */}
                                        <View style={[
                                            styles.statusIconContainer,
                                            { backgroundColor: getStatusColor(item.status) + "20" }
                                        ]}>
                                            <Icon
                                                name={getStatusIcon(item.status)}
                                                size={26}
                                                color={getStatusColor(item.status)}
                                            />
                                        </View>

                                        {/* Details */}
                                        <View style={styles.detailsContainer}>
                                            <View style={styles.statusRow}>
                                                <Text style={[
                                                    styles.statusText,
                                                    { color: getStatusColor(item.status) }
                                                ]}>
                                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                                </Text>
                                                <Text style={styles.timeText}>
                                                    {formatTime(item.createdAt)}
                                                </Text>
                                            </View>

                                            <Text style={styles.dateText}>
                                                {formatDate(item.createdAt)}
                                            </Text>

                                            {item.remarks && (
                                                <Text style={styles.remarksText}>
                                                    {item.remarks}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: "#F8FAFC",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },

    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },

    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: "#64748B",
    },

    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
    },
    errorText: {
        marginTop: 12,
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
    },
    retryText: {
        marginTop: 20,
        color: "#6366F1",
        fontSize: 16,
        fontWeight: "600",
    },

    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 80,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: "#64748B",
    },

    /* Timeline Styles */
    timelineContainer: {
        paddingLeft: 8,
    },
    timelineItem: {
        marginBottom: 28,
        position: "relative",
    },
    verticalLine: {
        position: "absolute",
        left: 19,
        top: 42,
        bottom: -20,
        width: 3,
        backgroundColor: "#E2E8F0",
        borderRadius: 2,
    },
    timelineContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    statusIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
    },
    detailsContainer: {
        flex: 1,
        paddingTop: 4,
    },
    statusRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    statusText: {
        fontSize: 16,
        fontWeight: "700",
    },
    timeText: {
        fontSize: 13,
        color: "#64748B",
    },
    dateText: {
        fontSize: 13.5,
        color: "#94A3B8",
        marginBottom: 6,
    },
    remarksText: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },
});