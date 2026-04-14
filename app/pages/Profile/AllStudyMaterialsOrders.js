import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Alert,
    TouchableOpacity,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import api from "../../constant/fetcher";

export default function AllStudyMaterialsOrders({ navigation }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyOrders();
    }, []);

    const fetchMyOrders = async () => {
        try {
            const res = await api.get("/study-materials/my-materials");
            if (res.data.success) setOrders(res.data.data);
        } catch {
            Alert.alert("Error", "Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const statusColor = (s) => {
        switch (s?.toLowerCase()) {
            case "delivered": return "#10B981";
            case "shipped":
            case "dispatched": return "#3B82F6";
            case "processing": return "#F59E0B";
            case "confirmed": return "#6366F1";
            default: return "#94A3B8";
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={s.center}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={s.loadingText}>Loading orders…</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.root} edges={["top"]}>
            <View style={s.header}>
                <Text style={s.headerTitle}>My Orders</Text>
                <Text style={s.headerCount}>{orders.length} {orders.length === 1 ? "order" : "orders"}</Text>
            </View>

            <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
                {orders.length === 0 ? (
                    <View style={s.empty}>
                        <Icon name="book-outline" size={56} color="#CBD5E1" />
                        <Text style={s.emptyTitle}>No orders yet</Text>
                        <Text style={s.emptyBody}>Your purchased study materials will appear here</Text>
                    </View>
                ) : (
                    orders.map((order) => {
                        const m = order.material || {};
                        const color = statusColor(order.deliveryStatus);
                        const hasTracking = order.deliveryStatus && order.deliveryStatus !== "pending";

                        return (
                            <View key={order.id} style={s.card}>
                                {/* Cover */}

                                {/* Content */}
                                <View style={s.content}>
                                    <Text style={s.title} numberOfLines={2}>{m.title}</Text>

                                    <View style={s.row}>
                                        <Text style={s.price}>₹{parseFloat(order.purchasePrice).toFixed(0)}</Text>
                                        <View style={s.chip}>
                                            <Text style={s.chipText}>{order.accessType}</Text>
                                        </View>
                                    </View>

                                    <Text style={s.date}>
                                        {new Date(order.purchaseDate).toLocaleDateString("en-IN", {
                                            day: "2-digit", month: "short", year: "numeric",
                                        })}
                                    </Text>

                                    {order.deliveryStatus && (
                                        <View style={s.statusRow}>
                                            <View style={[s.dot, { backgroundColor: color }]} />
                                            <Text style={[s.statusText, { color }]}>
                                                {order.deliveryStatus.charAt(0).toUpperCase() + order.deliveryStatus.slice(1)}
                                            </Text>
                                            {order.trackingNumber && (
                                                <Text style={s.tracking}>· {order.trackingNumber}</Text>
                                            )}
                                        </View>
                                    )}

                                    <View style={s.actions}>
                                        <TouchableOpacity
                                            style={s.btnOutline}
                                            onPress={() => navigation.navigate("StudyMaterials-details", { slug: m.id })}
                                        >
                                            <Icon name="eye-outline" size={14} color="#6366F1" />
                                            <Text style={s.btnOutlineText}>Details</Text>
                                        </TouchableOpacity>

                                        {hasTracking && (
                                            <TouchableOpacity
                                                style={s.btnFill}
                                                onPress={() => navigation.navigate("check-status", { purchaseId: order.id })}
                                            >
                                                <Icon name="map-marker-path" size={14} color="#fff" />
                                                <Text style={s.btnFillText}>Track</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: "#F8FAFC" },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" },
    loadingText: { marginTop: 10, fontSize: 13, color: "#94A3B8" },

    header: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 0.5,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: { fontSize: 18, fontWeight: "600", color: "#0F172A" },
    headerCount: { fontSize: 12, color: "#94A3B8", marginTop: 2 },

    list: { padding: 12, gap: 10, paddingBottom: 40 },

    empty: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 15, fontWeight: "600", color: "#334155", marginTop: 12 },
    emptyBody: { fontSize: 13, color: "#94A3B8", textAlign: "center", marginTop: 6, lineHeight: 19 },

    card: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 14,
        borderWidth: 0.5,
        borderColor: "#E2E8F0",
        overflow: "hidden",
    },

    cover: { width: 88, backgroundColor: "#EEF2FF" },
    coverImg: { width: "100%", height: "100%" },
    coverFallback: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 120 },

    content: { flex: 1, padding: 12, gap: 5 },

    title: { fontSize: 14, fontWeight: "600", color: "#0F172A", lineHeight: 20 },

    row: { flexDirection: "row", alignItems: "center", gap: 8 },
    price: { fontSize: 14, fontWeight: "700", color: "#059669" },
    chip: {
        backgroundColor: "#F1F5F9",
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    chipText: { fontSize: 11, color: "#64748B" },

    date: { fontSize: 11, color: "#CBD5E1" },

    statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: "600" },
    tracking: { fontSize: 11, color: "#CBD5E1" },

    actions: { flexDirection: "row", gap: 8, marginTop: 4 },

    btnOutline: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#E0E7FF",
        backgroundColor: "#F5F3FF",
    },
    btnOutlineText: { fontSize: 12, fontWeight: "600", color: "#6366F1" },

    btnFill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: "#1E40AF",
    },
    btnFillText: { fontSize: 12, fontWeight: "600", color: "#fff" },
});