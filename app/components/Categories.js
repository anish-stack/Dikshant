import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { LOCAL_ENDPOINT } from "../constant/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 3;

/* ---------------- CATEGORY CARD ---------------- */
const CategoryCard = ({ item }) => {
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
      style={[styles.categoryCard, { width: CARD_WIDTH }]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={item.comingSoon}
    >
      <LinearGradient
        colors={item.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        {item.comingSoon && (
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>SOON</Text>
          </View>
        )}

        <View style={styles.iconContainer}>
          <Feather name={item.icon} size={18} color="#ffffff" />
        </View>

        <Text style={styles.categoryTitle} numberOfLines={2}>
          {item.title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

/* ---------------- MAIN COMPONENT ---------------- */
export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${LOCAL_ENDPOINT}/assets/category`);

      if (res.data?.success) {
        setCategories(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#6d28d9" />
      </View>
    );
  }

  // Split into rows of 3
  const firstRow = categories.slice(0, 3);
  const secondRow = categories.slice(3, 6);

  return (
    <View style={styles.container}>
      <View style={styles.categoriesSection}>
        <View style={styles.row}>
          {firstRow.map((item) => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.row}>
          {secondRow.map((item) => (
            <CategoryCard key={item.id} item={item} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  categoriesSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryCard: {
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradientContainer: {
    flex: 1,
    padding: 7,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  soonBadge: {
    position: "absolute",
    top: 3,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    zIndex: 1,
  },
  soonText: {
    fontSize: 6,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 16,
  },
  loader: {
    height: 110,
    justifyContent: "center",
    alignItems: "center",
  },
});
