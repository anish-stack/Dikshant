import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/auth.store";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as Application from "expo-application";
import { useSettings } from "../hooks/useSettings";
import { getBadgeCount } from "../utils/permissions";
const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.85;

export default function Header() {
  const { logout } = useAuthStore();
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeRoute, setActiveRoute] = useState("Home");
  const sidebarAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const { settings, refetch } = useSettings();
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  useEffect(() => {
    async () => {
      const countN = await getBadgeCount();
      setCount(countN);
    };
  }, []);
  const openSidebar = () => {
    refetch();
    triggerHaptic();
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(sidebarAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    triggerHaptic();
    Animated.parallel([
      Animated.timing(sidebarAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  };

  const handleMenuPress = (item) => {
    triggerHaptic();

    if (item.danger) {
      closeSidebar();
      setTimeout(() => {
        logout(navigation);
      }, 300);
    } else if (item.screen) {
      setActiveRoute(item.screen);
      closeSidebar();
      setTimeout(() => {
        navigation.navigate(item.screen);
      }, 300);
    } else {
      closeSidebar();
    }
  };

  const sidebarTranslateX = sidebarAnim;
  const overlayOpacity = overlayAnim;

  return (
    <>
      {/* HEADER */}
      <View style={styles.header}>
        {/* Logo */}
        <Image source={require("../assets/small.png")} style={styles.logo} />

        {/* Right Icons */}
        <View style={styles.rightIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            activeOpacity={0.7}
            onPress={() => {
              triggerHaptic();
              navigation.navigate("Notifications");
            }}
          >
            <Ionicons name="notifications-outline" size={22} color="#0f172a" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={openSidebar}
            activeOpacity={0.7}
          >
            <Feather name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      {/* OVERLAY */}
      {isOpen && (
        <Animated.View
          style={[styles.overlay, { opacity: overlayOpacity }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* SIDEBAR */}
      <Animated.View
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: sidebarTranslateX }],
          },
        ]}
        pointerEvents={isOpen ? "auto" : "none"}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidebarContent}
        >
          {/* Navigation Section */}
          <View style={styles.navigationSection}>
            <Text style={styles.sectionTitle}>Navigation</Text>
            {menuItems.navigation.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  activeRoute === item.screen && styles.activeMenuItem,
                ]}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item)}
              >
                <View
                  style={[
                    styles.menuIconWrapper,
                    activeRoute === item.screen && styles.activeMenuIcon,
                  ]}
                >
                  <Feather
                    name={item.icon}
                    size={20}
                    color={activeRoute === item.screen ? "#6366f1" : "#64748b"}
                  />
                </View>
                <Text
                  style={[
                    styles.menuText,
                    activeRoute === item.screen && styles.activeMenuText,
                  ]}
                >
                  {item.label}
                </Text>
                {item.badge && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                )}
                <Feather
                  name="chevron-right"
                  size={18}
                  color={activeRoute === item.screen ? "#6366f1" : "#cbd5e1"}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Settings Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            {menuItems.settings.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item)}
              >
                <View style={styles.menuIconWrapper}>
                  <Feather name={item.icon} size={20} color="#64748b" />
                </View>
                <Text style={styles.menuText}>{item.label}</Text>
                <Feather name="chevron-right" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            activeOpacity={0.8}
            onPress={() => handleMenuPress({ danger: true })}
          >
            <Feather name="log-out" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.sidebarFooter}>
            <Text style={styles.versionText}>
              App Version {Application.nativeApplicationVersion}
            </Text>
            <Text style={styles.copyrightText}>
              © {new Date().getFullYear()} {settings?.appName || "Dikshant ias"}
              . All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </Animated.View>
    </>
  );
}

// Menu Data
const menuItems = {
  navigation: [
    { icon: "home", label: "Home", screen: "Home" },
    { icon: "book-open", label: "My Courses", screen: "Profile" },
    { icon: "play-circle", label: "Recorded Courses", screen: "Courses" },
    { icon: "file-text", label: "Test Series", badge: "soon" },
    { icon: "user", label: "Profile", screen: "Profile" },
  ],

  settings: [
    { icon: "settings", label: "Settings", screen: "Settings" },
    { icon: "help-circle", label: "Help & Support", screen: "Support" },
    { icon: "info", label: "About", screen: "About" },
  ],
};

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  logo: {
    width: 120,
    height: 50,
    resizeMode: "contain",
  },
  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },

  // Sidebar
  sidebar: {
    position: "absolute",
    top: 0,
    right: 0,
    width: SIDEBAR_WIDTH,
    height: height,
    backgroundColor: "#ffffff",
    zIndex: 1000,
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  sidebarContent: {
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 30,
  },

  // Profile Section
  profileSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  closeBtn: {
    alignSelf: "flex-end",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#6366f1",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#64748b",
  },
  editProfileBtn: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#eef2ff",
  },

  // Quick Stats
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 6,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#f1f5f9",
  },

  // Sections
  navigationSection: {
    marginBottom: 24,
  },
  resourcesSection: {
    marginBottom: 24,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  // Menu Items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  activeMenuItem: {
    backgroundColor: "#eef2ff",
  },
  menuIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activeMenuIcon: {
    backgroundColor: "#ddd6fe",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    flex: 1,
  },
  activeMenuText: {
    color: "#6366f1",
    fontWeight: "700",
  },
  menuBadge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
  },

  // Logout Button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ef4444",
  },

  // Footer
  sidebarFooter: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  versionText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "600",
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 11,
    color: "#cbd5e1",
  },
});
