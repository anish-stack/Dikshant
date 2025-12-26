import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get("window");

const CARD_WIDTH = (width - 32 - 24) / 3;

const categories = [
  {
    id: 1,
    title: "Live Classes",
    subtitle: "Interactive learning",
    icon: "video",
    screen: "Courses",
    filter: "online",
    gradient: ["#667eea", "#764ba2"],
    students: "50K+",
    comingSoon: false,
  },
  {
    id: 2,
    title: "Recorded Courses",
    subtitle: "Learn at your pace",
    icon: "play-circle",
    screen: "Courses",
    filter: "recorded",
    gradient: ["#f093fb", "#f5576c"],
    students: "1M+",
    comingSoon: false,
  },
  {
    id: 3,
    title: "Offline Classes",
    subtitle: "Classroom experience",
    icon: "map-pin",
    screen: "Courses",
    filter: "offline",
    gradient: ["#4facfe", "#00f2fe"],
    students: "25K+",
    comingSoon: false,
  },
  {
    id: 4,
    title: "Study Materials",
    subtitle: "Notes & PDFs",
    icon: "book-open",
    screen: "ComingSoon",
    gradient: ["#ff9a9e", "#fad0c4"],
    students: "Coming Soon",
    comingSoon: true,
  },
  {
    id: 5,
    title: "Mock Tests",
    subtitle: "Practice & improve",
    icon: "edit-3",
    screen: "ComingSoon",
    gradient: ["#fa709a", "#fee140"],
    students: "Coming Soon",
    comingSoon: true,
  },
  {
    id: 6,
    title: "Doubt Solving",
    subtitle: "Get instant help",
    icon: "help-circle",
    screen: "ComingSoon",
    gradient: ["#fbc2eb", "#a6c1ee"],
    students: "Coming Soon",
    comingSoon: true,
  },
];

const QuickActionItem = ({ item }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (item.comingSoon) return;

    if (item.screen === "Courses" && item.filter) {
      navigation.navigate(item.screen, { filter: item.filter });
    } else {
      navigation.navigate(item.screen);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.quickActionItem, { width: CARD_WIDTH }]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={item.comingSoon}
    >
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.quickActionIcon}>
          <Feather name={item.icon} size={16} color="#ffffff" />
        </View>
        <Text style={styles.quickActionText} numberOfLines={1}>
          {item.title}
        </Text>
        {item.comingSoon && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function Categories() {
  // Split into two rows
  const firstRow = categories.slice(0, 3);
  const secondRow = categories.slice(3, 6);

  return (
    <View style={styles.container}>
      <View style={styles.quickActionsSection}>
        {/* First Row - 3 items */}
        <View style={styles.row}>
          {firstRow.map((item) => (
            <QuickActionItem key={item.id} item={item} />
          ))}
        </View>

        {/* Second Row - 3 items */}
        <View style={[styles.row, styles.secondRow]}>
          {secondRow.map((item) => (
            <QuickActionItem key={item.id} item={item} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  quickActionsSection: {
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  secondRow: {
    marginTop: 12,
  },
  quickActionItem: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  gradientBackground: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: "relative",
  },
  quickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  comingSoonBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  comingSoonText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});