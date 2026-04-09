import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Animated,
    Dimensions,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import api from "../../constant/fetcher";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const ICON_MAP = [
    "book-open-page-variant", "file-document-outline", "newspaper-variant-outline",
    "pencil-box-outline", "flask-outline", "calculator-variant-outline",
    "earth", "history", "account-group-outline", "chart-bar", "translate", "lightbulb-outline",
];

const CARD_COLORS = [
    { bg: "#fff0f0", icon: "#E53935" },
    { bg: "#fce4ec", icon: "#c2185b" },
    { bg: "#fff3e0", icon: "#e65100" },
    { bg: "#f3e5f5", icon: "#7b1fa2" },
    { bg: "#e8f5e9", icon: "#2e7d32" },
    { bg: "#e3f2fd", icon: "#1565c0" },
];

const TABS = ["All", "Notes", "PDFs", "Magazines", "Practice"];

const { width } = Dimensions.get("window");
const FEATURED_WIDTH = width - 32;           // Full width minus safe padding (16 on each side)
const SPACING = 12;

export default function AllStudyMaterialCats() {
    const navigation = useNavigation();

    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState(null);
    const [featuredMaterials, setFeaturedMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("All");

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scrollRef = useRef(null);
    const intervalRef = useRef(null);
    const currentIndexRef = useRef(0);

    useEffect(() => {
        fetchData();
        return () => clearInterval(intervalRef.current);
    }, []);

    const fetchData = async () => {
        try {
            const [catRes, statsRes] = await Promise.all([
                api.get("/study-materials/categories"),
                api.get("/study-materials/stats-for-user"),
            ]);

            const statsData = statsRes.data.data || {};

            setCategories(catRes.data.data || []);
            setStats(statsData);
            setFeaturedMaterials(statsData.totalFeaturedMaterials || []);

            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]).start();
        } catch (error) {
            console.log("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Auto slider
    useEffect(() => {
        if (featuredMaterials.length <= 1) return;

        intervalRef.current = setInterval(() => {
            currentIndexRef.current = (currentIndexRef.current + 1) % featuredMaterials.length;
            scrollRef.current?.scrollTo({
                x: currentIndexRef.current * (FEATURED_WIDTH + SPACING),
                animated: true,
            });
        }, 3800);

        return () => clearInterval(intervalRef.current);
    }, [featuredMaterials.length]);

    const openCategory = (slug) => navigation.navigate("StudyMaterials", { slug });
    const openFeatured = (item) => navigation.navigate("StudyMaterials-details", { slug: item.id });

    const renderFeatured = (item) => (
        <TouchableOpacity
            style={[styles.featuredCard, { width: FEATURED_WIDTH }]}
            activeOpacity={0.88}
            onPress={() => openFeatured(item)}
        >
            <View style={styles.featuredCircle1} />
            <View style={styles.featuredCircle2} />

            <View style={styles.featuredContent}>
                <View style={styles.featuredTag}>
                    <Text style={styles.featuredTagText}>FEATURED</Text>
                </View>
                <Text style={styles.featuredTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.featuredDesc} numberOfLines={2}>{item.description}</Text>
            </View>

            <View style={styles.featuredIconContainer}>
                <Icon name="newspaper-variant-outline" size={42} color="#fff" />
            </View>
        </TouchableOpacity>
    );

    const ListHeader = () => (
        <View>
            {/* ==================== FEATURED SLIDER ==================== */}
            {featuredMaterials.length > 0 && (
                <View style={styles.featuredContainer}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        snapToInterval={FEATURED_WIDTH + SPACING}
                        snapToAlignment="center"
                        decelerationRate="fast"
                        scrollEventThrottle={16}
                        contentContainerStyle={styles.featuredScrollContent}
                        onScrollBeginDrag={() => clearInterval(intervalRef.current)}
                        onMomentumScrollEnd={(event) => {
                            const index = Math.round(
                                event.nativeEvent.contentOffset.x / (FEATURED_WIDTH + SPACING)
                            );
                            currentIndexRef.current = Math.max(0, Math.min(index, featuredMaterials.length - 1));
                        }}
                    >
                        {featuredMaterials.map((item, index) => (
                            <View key={index} style={{ marginRight: SPACING }}>
                                {renderFeatured(item)}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* STATS */}
            <View style={styles.statsRow}>
                {[
                    { label: "Materials", value: stats?.totalMaterials ?? "—" },
                    { label: "Notes", value: stats?.totalNotes ?? "—" },
                    { label: "PDFs", value: stats?.totalPracticePDF ?? "—" },
                ].map((item) => (
                    <View key={item.label} style={styles.statCard}>
                        <Text style={styles.statNum}>{item.value}</Text>
                        <Text style={styles.statLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#E53935" />
                <Text style={styles.loadingText}>Loading study materials...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.headerTitle}>Study Materials</Text>
                    <Text style={styles.headerSub}>
                        {stats?.totalCategories ?? categories.length} categories
                    </Text>
                </View>

            </View>

            <FlatList
                data={categories}
                renderItem={({ item, index }) => {
                    const color = CARD_COLORS[index % CARD_COLORS.length];
                    const iconName = ICON_MAP[index % ICON_MAP.length];

                    return (
                        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], width: "48%" }}>
                            <TouchableOpacity style={styles.card} onPress={() => openCategory(item.id)}>
                                <View style={[styles.cardAccent, { backgroundColor: color.icon }]} />
                                <View style={[styles.iconBox, { backgroundColor: color.bg }]}>
                                    <Icon name={iconName} size={30} color={color.icon} />
                                </View>
                                <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
                                <View style={styles.cardFooter}>
                                    <Text style={[styles.cardSub, { color: color.icon }]}>View Materials</Text>
                                    <Icon name="arrow-right" size={16} color={color.icon} />
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                }}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
                ListHeaderComponent={ListHeader}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Icon name="book-search-outline" size={60} color="#ddd" />
                        <Text style={styles.emptyText}>No categories found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#f7f7f7" },

    header: {
        backgroundColor: "#E53935",
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    headerBtn: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: "rgba(255,255,255,0.25)",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: { color: "#fff", fontSize: 19, fontWeight: "700" },
    headerSub: { color: "rgba(255,255,255,0.8)", fontSize: 12.5 },

    /* ==================== FEATURED SECTION ==================== */
    featuredContainer: { marginTop: 16, marginBottom: 16, },
    featuredScrollContent: {
        paddingHorizontal: 0,           // This ensures equal space on both sides
    },
    featuredCard: {
        backgroundColor: "#E53935",
        borderRadius: 20,
        padding: 18,
        flexDirection: "row",
        overflow: "hidden",

    },
    featuredCircle1: {
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "rgba(255,255,255,0.1)",
        top: -30,
        right: -20,
    },
    featuredCircle2: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(255,255,255,0.08)",
        bottom: -35,
        right: 30,
    },
    featuredContent: { flex: 1, paddingRight: 12 },
    featuredTag: {
        backgroundColor: "rgba(255,255,255,0.28)",
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 10,
    },
    featuredTagText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    featuredTitle: { color: "#fff", fontSize: 14, fontWeight: "700", lineHeight: 22, marginBottom: 6 },
    featuredDesc: { color: "rgba(255,255,255,0.82)", fontSize: 11, lineHeight: 18 },
    featuredIconContainer: {
        width: 68,
        height: 68,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center",
        justifyContent: "center",
    },


    statsRow: { flexDirection: "row", gap: 12, paddingHorizontal: 8, marginBottom: 20 },
    statCard: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        elevation: 0.1,
    },
    statNum: { fontSize: 21, fontWeight: "700", color: "#E53935" },
    statLabel: { fontSize: 11.5, color: "#888", marginTop: 4 },

    row: { justifyContent: "space-between" },
    card: {
        backgroundColor: "#fff",
        borderRadius: 18,
        marginBottom: 16,
        overflow: "hidden",
    },
    cardAccent: { height: 4 },
    iconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        margin: 14,
        marginBottom: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: { fontSize: 14.5, fontWeight: "700", color: "#222", paddingHorizontal: 14, marginBottom: 8 },
    cardFooter: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 14 },
    cardSub: { fontSize: 12.5, fontWeight: "600" },

    loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
    loadingText: { marginTop: 14, fontSize: 15, color: "#777" },
    emptyBox: { alignItems: "center", paddingVertical: 60 },
    emptyText: { marginTop: 12, fontSize: 15, color: "#bbb" },
});