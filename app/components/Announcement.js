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

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const CARD_WIDTH = screenWidth - 32; // 16px padding on each side — text won't clip
const CARD_MIN_HEIGHT = screenHeight * 0.09; // ~11% of screen height, fits all displays

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
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -30, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
        slideAnim.setValue(30);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();
      });
    }, 5500);

    return () => clearInterval(interval);
  }, [announcements]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6b48ff" />
      </View>
    );
  }

  if (announcements.length === 0) return null;

  const current = announcements[currentIndex];

  const bgColor = current.backgroundColor || "#F0F4FF";
  const textColor = current.textColor || "#1A1A2E";
  const textSizeBase = parseFloat(current.textSize) || 13;
  const arrowBg = current.arrowBackgroundColor || "#6b48ff";
  const arrowColor = current.arrowColor || "#ffffff";

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => navigation.navigate("annouce-details", { id: current.id })}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: bgColor,
              width: CARD_WIDTH,
              minHeight: CARD_MIN_HEIGHT,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.innerRow}>
           

            {/* Optional image */}
            {current.image ? (
              <Image
                source={{ uri: current.image }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.iconFallback, { backgroundColor: arrowBg + "22" }]}>
                <FontAwesome name="bullhorn" size={18} color={arrowBg} />
              </View>
            )}

            {/* Text block — flex:1 ensures it never overflows */}
            <View style={styles.textBlock}>
              <Text
                style={[styles.title, { color: textColor, fontSize: textSizeBase + 1 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {current.title}
              </Text>
              <Text
                style={[styles.message, { color: textColor, fontSize: textSizeBase }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {current.message}
              </Text>
            </View>

            {/* Arrow CTA */}
            <View style={[styles.arrowButton, { backgroundColor: arrowBg }]}>
              <FontAwesome name="chevron-right" size={13} color={arrowColor} />
            </View>
          </View>

          {/* Dot indicators (only if multiple) */}
          {announcements.length > 1 && (
            <View style={styles.dotsRow}>
              {announcements.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === currentIndex ? arrowBg : arrowBg + "44",
                      width: i === currentIndex ? 16 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export default Announcement;

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    marginVertical: 8,
  },
  loadingContainer: {
    paddingVertical: 28,
    alignItems: "center",
  },
  card: {
    overflow: "hidden",
    // Soft shadow
    shadowColor: "#6b48ff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.112,
    shadowRadius: 1,
    elevation: 2,
  },
  innerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingRight: 14,
    paddingLeft: 0,
  },
  accentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 4,
    marginRight: 12,
  },
  bannerImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    marginRight: 12,
  },
  iconFallback: {
    marginLeft:3,
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textBlock: {
    flex: 1,          // ← key: takes remaining space, never overflows
    gap: 4,
    marginRight: 10,
  },
  title: {
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  message: {
    fontWeight: "400",
    lineHeight: 18,
    opacity: 0.78,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,    // ← never squishes the arrow
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    paddingBottom: 10,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});