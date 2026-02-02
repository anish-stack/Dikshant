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
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 2
  },

  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Geist",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  greetingContainer: {
    flex: 1,
    marginRight: 12,
  },

  greeting: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: "Geist",
    lineHeight: 28,
  },

  goal: {
    fontSize: 15,
    color: "#ffebee",
    marginTop: 6,
    fontFamily: "Geist-Medium",
    opacity: 0.9,
  },

  bulbButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },

  bulbIcon: {
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});