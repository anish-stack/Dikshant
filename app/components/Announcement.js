import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";
import { useNavigation } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

const Announcement = ({ refreshing }) => {
  const navigation = useNavigation();
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchAnnouncements = async () => {
    try {
      const response = await axios.get(`${API_URL_LOCAL_ENDPOINT}/announcements`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [refreshing]);

  useEffect(() => {
    if (announcements.length === 0) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -40, duration: 450, useNativeDriver: true }),
      ]).start(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
        slideAnim.setValue(40);

        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]).start();
      });
    }, 5500);

    return () => clearInterval(interval);
  }, [announcements]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6b48ff" />
      </View>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex];

  // ── Style parsing with safe fallbacks ──
  const bgColor = current.backgroundColor || "#ffffff";
  const textColor = current.textColor || "#222222";
  const textSizeBase = parseFloat(current.textSize) || 15;
  const arrowBg = current.arrowBackgroundColor || "#1976D2";
  const arrowSize = current.arrowSize || 48;

  const arrowColor = current.arrowColor || "#ffffff";

  // Width & Height handling
  let cardWidth = screenWidth - 16;
  if (current.width && current.width !== "100%") {
    const w = parseFloat(current.width);
    cardWidth = isNaN(w) ? cardWidth : w;
  }

  let cardHeight = 100;
  if (current.height) {
    const h = parseFloat(current.height.replace("px", ""));
    cardHeight = isNaN(h) ? cardHeight : h;
  }

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => navigation.navigate("annouce-details", { id: current.id })}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: bgColor,
            width: cardWidth,
            minHeight: cardHeight,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.innerRow}>
          {/* Optional banner image on left */}
          {current.image && (
            <Image
              source={{ uri: current.image }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.textBlock}>
            <Text
              style={[
                styles.title,
                { color: textColor, fontSize: textSizeBase + 3 },
              ]}
              numberOfLines={2}
            >
              {current.title}
            </Text>

            <Text
              style={[
                styles.message,
                { color: textColor, fontSize: textSizeBase },
              ]}
              numberOfLines={3}
            >
              {current.message}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.arrowButton, { backgroundColor: arrowBg }]}
            onPress={() => navigation.navigate("annouce-details", { id: current.id })}
          >
            <FontAwesome name="arrow-right" size={Number(arrowSize) || 20} color={arrowColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default Announcement;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 3,
    marginVertical: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    flex: 1,
  },
  bannerImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 14,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontWeight: "700",
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  message: {
    fontWeight: "500",
    lineHeight: 20,
    opacity: 0.92,
  },
  arrowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});