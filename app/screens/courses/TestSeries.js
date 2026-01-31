// TestSeries.jsx  (chhota version – bilkul same vibe as QuizCards)
import React from "react";
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.60;     // same chhota size
const IMAGE_HEIGHT = 110;

export default function TestSeries({ data = [], isComplementary = false }) {
    if (!Array.isArray(data) || data.length === 0) return null;

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.imageUrl || item.image || "https://via.placeholder.com/260x110" }}
                    style={styles.image}
                    resizeMode="cover"
                />
                <View style={styles.overlay} />

                {isComplementary && (
                    <View style={styles.smallBadge}>
                        <Text style={styles.badgeText}>Free</Text>
                    </View>
                )}
            </View>

            <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>
                    {item.title}
                </Text>

                {item.description ? (
                    <Text style={styles.desc} numberOfLines={1}>
                        {item.description}
                    </Text>
                ) : null}

                <Text style={styles.price}>
                    {item.price > 0 ? `₹${item.price}` : "Free"}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Test Series</Text>
            <FlatList
                data={data}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 6,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: "700",
        marginLeft: 16,
        marginBottom: 8,
    },
    list: {
        paddingHorizontal: 16,
    },
    card: {
        width: CARD_WIDTH,
        marginRight: 12,
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.13,
        shadowRadius: 6,
        elevation: 1,
    },
    imageContainer: {
        position: "relative",
    },
    image: {
        width: "100%",
        aspectRatio: 16 / 9.5,

    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.12)",
    },
    smallBadge: {
        position: "absolute",
        top: 8,
        left: 8,
        backgroundColor: "rgba(34,197,94,0.95)", // green for free/complementary
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "600",
    },
    content: {
        padding: 10,
        paddingTop: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
        color: "#111",
        lineHeight: 18,
        marginBottom: 4,
    },
    desc: {
        fontSize: 11.5,
        color: "#555",
        lineHeight: 14,
        marginBottom: 6,
    },
    price: {
        fontSize: 14,
        fontWeight: "700",
        color: "#7c3aed", // thoda alag vibe (purple-ish) for Test Series – optional change
    },
});