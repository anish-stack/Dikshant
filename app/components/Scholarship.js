import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
const Scholarship = () => {
  const navigation = useNavigation();

  const goToApply = () => navigation.navigate("apply-sch");

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.95}
        onPress={goToApply}
      >
        {/* Image with gradient overlay */}
        <View style={styles.imageWrapper}>
          <Image
            source={{
              uri: "https://res.cloudinary.com/dglihfwse/image/upload/v1766726612/scholarship-heros_ydcbde.jpg",
            }}
            style={styles.bannerImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />

          {/* Gradient overlay for better text readability */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.95)"]}
            style={styles.gradient}
          />
        </View>

        {/* Content overlay */}
        <View style={styles.contentOverlay}>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={goToApply}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>Apply Now</Text>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default Scholarship;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",

  },
  imageWrapper: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "60%",
  },
  contentOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  textContainer: {
    marginBottom: 16,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(247, 181, 0, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#000",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
    fontWeight: "500",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,

  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginRight: 8,
    letterSpacing: 0.3,
  },
  arrow: {
    width: 24,
    height: 24,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
});