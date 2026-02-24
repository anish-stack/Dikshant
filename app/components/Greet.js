import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function Greet({refreshing}) {
  const { user, token, getProfile, loggedIn } = useAuthStore();

  // Fetch profile only if logged in and user is not loaded
  useEffect(() => {
    if (loggedIn && token && !user) {
      getProfile(); // This is a sync getter now? Wait — see note below!
    }
  }, [loggedIn, token, user, getProfile,refreshing]);

  // Tip of the day
  const tips = [
    "One focused hour beats three distracted ones.",
    "Revise weekly to lock in knowledge.",
    "Mock tests build real confidence.",
    "Break goals into daily wins.",
    "Take 5-min breaks every 30 mins.",
    "Solve past papers to master patterns.",
    "Consistency > perfection.",
    "Stay calm — progress is building.",
  ];

  const randomTip = useMemo(() => {
    return tips[Math.floor(Math.random() * tips.length)];
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const greetingMessage = `${getGreeting()}, ${user?.name?.split(" ")[0] || "there"}!`;

  const showTipAlert = () => {
    Alert.alert("Tip of the Day", randomTip, [{ text: "Got it!", style: "default" }]);
  };

  // Show loading if user is being fetched
  if (loggedIn && token && !user && refreshing) {
    return (
      <LinearGradient colors={["#DC3545", "#d62828"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#DC3545", "#d62828"]} style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{greetingMessage}</Text>

          {user?.mission ? (
            <Text style={styles.goal}>Goal: {user.mission}</Text>
          ) : user ? (
            <Text style={styles.goal}>Set your goal to stay motivated!</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.bulbButton} onPress={showTipAlert}>
          <Ionicons name="bulb-outline" size={26} color="#fff" style={styles.bulbIcon} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 10, // 🔥 less padding
    marginBottom: 2,
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  loadingText: {
    color: "#fff",
    fontSize: 14, // 🔥 smaller
    fontFamily: "Geist",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  greetingContainer: {
    flex: 1,
    marginRight: 10,
  },

  greeting: {
    fontSize: 18, // 🔥 reduced from 22
    fontWeight: "700",
    color: "#fff",
    fontFamily: "Geist",
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.2)", // 🔥 softer shadow
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  goal: {
    fontSize: 13, // 🔥 smaller
    color: "#ffebee",
    marginTop: 4,
    fontFamily: "Geist-Medium",
    opacity: 0.85,
  },

  bulbButton: {
    width: 42, // 🔥 smaller
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  bulbIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});