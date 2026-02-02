import React, { useEffect, useRef, useState } from "react";
import { View, Text, Animated, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const Announcement = ({refreshing}) => {
  const navigation = useNavigation()
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 🔹 Fetch announcements from API
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

  // 🔹 Animation interval
  useEffect(() => {
    if (announcements.length === 0) return;

    const interval = setInterval(() => {
      // Fade out and slide
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 300, useNativeDriver: true })
      ]).start(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
        slideAnim.setValue(20);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true })
        ]).start();
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [announcements]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  if (announcements.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No announcements available</Text>
      </View>
    );
  }

  const current = announcements[currentIndex];

  return (
    <TouchableOpacity onPress={()=> navigation.navigate("annouce-details",{id:current.id})} activeOpacity={0.9} style={styles.container}>
      <View style={styles.card}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.textContainer}>
            <Text style={styles.title}>{current.title}</Text>
            <Text style={styles.message}>{current.message}</Text>
          </View>

          <TouchableOpacity onPress={()=> navigation.navigate("annouce-details",{id:current.id})} style={[styles.actionButton, { backgroundColor: "#1976D2" }]}>
            <Text style={styles.buttonText}>
              <FontAwesome name="arrow-right" />
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

export default Announcement;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8, marginTop: 12, marginBottom: 8 },
  card: {
    borderRadius: 6,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    padding: 16,
    backgroundColor: "#E3F2FD",
  },
  content: { flexDirection: "row", alignItems: "center", gap: 12 },
  textContainer: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2, color: "#1976D2" },
  message: { fontSize: 13, color: "#424242", fontWeight: "500", lineHeight: 18 },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
});
