import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");
const BOTTOM_GESTURE_THRESHOLD = 16;
export default function BottomBar() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const isGestureNavigation = insets.bottom >= BOTTOM_GESTURE_THRESHOLD;
  const TAB_BAR_HEIGHT = isGestureNavigation ? 72 : 56;
  // console.log("Navigation", isGestureNavigation)
  const tabs = [
    { label: "Home", icon: "home", screen: "Home", comingSoon: false },
    {
      label: "Courses",
      icon: "book-open",
      screen: "Courses",
      comingSoon: false,
    },
    {
      label: "Quiz",
      icon: "file-text",
      screen: "Quiz-Intro",
      comingSoon: false,
      title: "Interactive Quizzes",
      description:
        "Test your knowledge with AI-powered quizzes, instant feedback, and detailed explanations.",
      features: [
        "🎯 Smart question selection",
        "⚡ Instant scoring & analysis",
        "📊 Track your progress",
        "🏆 Compete with peers",
      ],
      gradient: ["#667eea", "#764ba2"],
    },
    // {
    //   label: "Test Series",
    //   icon: "book",
    //   screen: "IntroTestSeries",
    //   comingSoon: false,
    //   title: "Professional Test Series",
    //   description:
    //     "Prepare like a pro with full-length mock tests designed by experts.",
    //   features: [
    //     "📝 Comprehensive mock tests",
    //     "🎓 Expert-crafted questions",
    //     "📈 Detailed performance reports",
    //     "⏱️ Real exam simulation",
    //   ],
    //   gradient: ["#f093fb", "#f5576c"],
    // },
    { label: "Profile", icon: "user", screen: "Profile", comingSoon: false },
  ];

  const handleTabPress = (tab) => {
    if (tab.comingSoon) {
      setSelectedFeature(tab);
      setModalVisible(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      return;
    }
    navigation.navigate(tab.screen);
  };

  const closeModal = () => {
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setSelectedFeature(null);
    });
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            height: TAB_BAR_HEIGHT + (isGestureNavigation ? insets.bottom : 0),
            paddingBottom: isGestureNavigation ? insets.bottom : 0,
          },
        ]}
      >

        {tabs.map((tab, index) => {
          const isActive = route.name === tab.screen;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.tab, { height: 20 + insets.bottom }]}
              activeOpacity={0.7}
              onPress={() => handleTabPress(tab)}
            >
              <View style={styles.tabContent}>
                <Feather
                  name={tab.icon}
                  size={16}
                  color={isActive ? "#ff0000" : "#666"}
                />
                <Text style={[styles.label, isActive && styles.activeLabel]}>
                  {tab.label}
                </Text>

                {isActive && <View style={styles.activeBar} />}

                {tab.comingSoon && (
                  <View style={styles.comingSoonBadge}>
                    <Text style={styles.comingSoonText}>Soon</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModal}>
          <Animated.View
            style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}
            onStartShouldSetResponder={() => true} // 👈 BLOCK backdrop click
          >
            {/* HEADER */}
            <LinearGradient
              colors={["#ef4444", "#dc2626"]}
              style={styles.modalHeader} g
            >
              <View style={styles.iconContainer}>
                <Feather name={selectedFeature?.icon} size={40} color="#fff" />
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                <Feather name="x" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* BODY */}
            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>{selectedFeature?.title}</Text>
              <Text style={styles.modalDescription}>
                {selectedFeature?.description}
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width,

    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderColor: "#eee",
    position: "absolute",
    bottom: 0,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {

    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    position: "relative",
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
  activeLabel: {
    color: "#ff0000",
    fontWeight: "600",
  },
  activeBar: {
    width: 28,
    height: 3,
    backgroundColor: "#ff0000",
    borderRadius: 10,
    marginTop: 6,
  },
  comingSoonBadge: {
    position: "absolute",
    top: -6,
    right: -12,
    backgroundColor: "#ff0000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  comingSoonText: {
    color: "#fff",
    fontSize: 6,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  blurView: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width - 48,
    maxHeight: height * 0.8,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  comingSoonPill: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  comingSoonPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeButton: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 12,
  },
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  notifySection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  notifyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },
  notifyTextContainer: {
    flex: 1,
  },
  notifyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 2,
  },
  notifySubtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  notifyButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  notifyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
  },
});
