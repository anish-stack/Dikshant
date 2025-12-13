// screens/Profile/index.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
  Linking,
} from "react-native";

import { Feather } from "@expo/vector-icons";
import Layout from "../../components/layout";
import * as Haptics from "expo-haptics";
import { useAuthStore } from "../../stores/auth.store";
import useSWR from "swr";
import { fetcher } from "../../constant/fetcher";
import { useNavigation } from "@react-navigation/native";
import { useSettings } from "../../hooks/useSettings";

const { width } = Dimensions.get("window");

const menuOptions = [
  {
    label: "Notifications",
    icon: "bell",
    screen: "Notifications",
  },
  {
    label: "Payment History",
    icon: "credit-card",
    screen: "PaymentHistory",
  },
  // {
  //   label: "Downloads",
  //   icon: "download",
  //   screen: "Downloads",
  // },
  {
    label: "Terms & Conditions",
    icon: "file-text",
    screen: "TermsConditions",
  },
  {
    label: "Privacy Policy",
    icon: "shield",
    screen: "PrivacyPolicy",
  },
];

const quickActions = [
  {
    label: "Settings",
    icon: "settings",
    bg: "#DBEAFE",
    color: "#3B82F6",
    screen: "Settings",
  },
  {
    label: "Share App",
    icon: "share-2",
    bg: "#E0E7FF",
    color: "#6366F1",
    screen: "ShareApp",
  },
  {
    label: "Rate Us",
    icon: "star",
    bg: "#FEF3C7",
    color: "#F59E0B",
    screen: "RateUs",
  },
  {
    label: "Scholarships",
    icon: "award",
    bg: "#DCFCE7",
    color: "#22C55E",
    screen: "apply-sch",
  },
  {
    label: "Offers",
    icon: "gift",
    bg: "#FEE2E2",
    color: "#EF4444",
    screen: "Offers",
  },
  {
    label: "Help & Support",
    icon: "help-circle",
    bg: "#FCE7F3",
    color: "#EC4899",
    screen: "HelpSupport",
  },
];

const colors = {
  primary: "#DC2626",
  secondary: "#1F2937",
  background: "#FFFFFF",
  surface: "#FAFAFA",
  text: "#111827",
  textSecondary: "#6B7280",
  textLight: "#9CA3AF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E5E7EB",
  lightRed: "#FEF2F2",
  lightGreen: "#F0FDF4",
  lightBlue: "#EFF6FF",
  white: "#FFFFFF",
};

export default function Profile() {
  const { user ,logout } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState("all");
  const navigation = useNavigation();
  const {
    data: ordersData,
    error,
    isLoading,
  } = useSWR(user?.id ? `/Orders/user/${user.id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const myCourses = ordersData || [];
  const { settings, refetch } = useSettings();

  const getStatusColor = (status) => {
    switch (status) {
      case "Start Soon":
        return { bg: "#FEF3C7", text: "#92400E" };
      case "In Progress":
        return { bg: "#DBEAFE", text: "#1E40AF" };
      case "Partially Complete":
        return { bg: "#E0E7FF", text: "#4338CA" };
      case "Completed":
        return { bg: "#D1FAE5", text: "#065F46" };
      default:
        return { bg: "#F3F4F6", text: "#374151" };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const filteredCourses = myCourses.filter((order) => {
    if (selectedTab === "all") return true;
    if (selectedTab === "in-progress")
      return order.batch?.c_status === "In Progress";
    if (selectedTab === "completed")
      return order.batch?.c_status === "Completed";
    return true;
  });

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const handleLogout = async () => {
    console.log("Call")
   const l =  await logout(navigation);
   console.log(l)
  };

  const redirectCourse = (id) => {
    try {
      navigation.navigate("my-course", { unlocked: true, courseId: id });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  if (isLoading) {
    return (
      <Layout isHeaderShow={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout isHeaderShow={true}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.headerCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {user?.name ? user?.name.charAt(0).toUpperCase() : "U"}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.studentName}>{user?.name || "Student"}</Text>
              <Text style={styles.enrollmentId}>
                ID: DIKSHANT{user?.id || ""}
              </Text>
              <Text style={styles.joinDate}>
                Joined {user?.createdAt ? formatDate(user.createdAt) : "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Feather name="mail" size={12} color={colors.textSecondary} />
              <Text style={styles.contactText}>{user?.email || "N/A"}</Text>
            </View>
            <View style={styles.contactRow}>
              <Feather name="phone" size={12} color={colors.textSecondary} />
              <Text style={styles.contactText}>{user?.mobile || "N/A"}</Text>
            </View>
          </View>
        </View>

        {/* My Courses Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              My Courses ({myCourses.length})
            </Text>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {["all", "in-progress", "completed"].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, selectedTab === tab && styles.tabActive]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedTab(tab);
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === tab && styles.tabTextActive,
                  ]}
                >
                  {tab === "all"
                    ? "All"
                    : tab === "in-progress"
                    ? "In Progress"
                    : "Completed"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Course List */}
          {filteredCourses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="book-open" size={32} color={colors.primary} />
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          ) : (
            filteredCourses.map((order) => {
              const batch = order.batch;
              const statusStyle = getStatusColor(batch?.c_status);

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.courseCard}
                  activeOpacity={0.8}
                  onPress={() => redirectCourse(order?.batch?.id)}
                >
                  <View style={styles.courseContent}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusStyle.text }]}
                      >
                        {batch?.c_status || "Active"}
                      </Text>
                    </View>

                    <Text style={styles.courseTitle} numberOfLines={2}>
                      {batch?.name || "Course Name"}
                    </Text>

                    {batch?.program && (
                      <Text style={styles.programText}>
                        {batch.program.name}
                      </Text>
                    )}

                    {order.subjects && order.subjects.length > 0 && (
                      <View style={styles.subjectsContainer}>
                        {order.subjects.slice(0, 3).map((sub) => (
                          <View key={sub.id} style={styles.subjectTag}>
                            <Text style={styles.subjectTagText}>
                              {sub.name}
                            </Text>
                          </View>
                        ))}
                        {order.subjects.length > 3 && (
                          <Text style={styles.moreSubjects}>
                            +{order.subjects.length - 3} more
                          </Text>
                        )}
                      </View>
                    )}

                    <View style={styles.priceContainer}>
                      <View>
                        <Text style={styles.originalPrice}>
                          ₹{order.amount?.toLocaleString("en-IN")}
                        </Text>
                        <Text style={styles.finalPrice}>
                          Paid: ₹{order.totalAmount?.toLocaleString("en-IN")}
                        </Text>
                      </View>
                      {order.couponCode && (
                        <View style={styles.couponBadge}>
                          <Feather name="tag" size={8} color={colors.success} />
                          <Text style={styles.couponText}>
                            {order.couponCode}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.datesRow}>
                      <View style={styles.dateItem}>
                        <Feather
                          name="calendar"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.dateText}>
                          Starts:{" "}
                          {batch?.startDate
                            ? formatDate(batch.startDate)
                            : "N/A"}
                        </Text>
                      </View>
                      <View style={styles.dateItem}>
                        <Feather
                          name="clock"
                          size={10}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.dateText}>
                          Enrolled: {formatDate(order.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={styles.progressBarBackground}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width:
                                  batch?.c_status === "Start Soon"
                                    ? "0%"
                                    : batch?.c_status === "In Progress"
                                    ? "65%"
                                    : batch?.c_status === "Partially Complete"
                                    ? "85%"
                                    : "100%",
                                backgroundColor:
                                  batch?.c_status === "Start Soon"
                                    ? colors.warning
                                    : batch?.c_status === "In Progress"
                                    ? colors.primary
                                    : batch?.c_status === "Partially Complete"
                                    ? "#3B82F6"
                                    : colors.success,
                              },
                            ]}
                          />
                        </View>
                      </View>
                      <Text style={styles.progressText}>
                        {(() => {
                          switch (batch?.c_status) {
                            case "Start Soon":
                              return "Not Started";
                            case "In Progress":
                              return "In Progress";
                            case "Partially Complete":
                              return "Partially Complete";
                            case "Completed":
                              return "100% Complete";
                            default:
                              return "Status Unknown";
                          }
                        })()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.quickActionsGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionCard}
                activeOpacity={0.7}
                onPress={() => {
                  triggerHaptic();
                  navigation.navigate(item.screen);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon} size={16} color={item.color} />
                </View>

                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Options</Text>

          <View style={styles.menuCard}>
            {menuOptions.map((item, index) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic();
                    refetch();
                    // Open external URL for Terms & Privacy if URLs exist
                    if (item.screen === "TermsConditions") {
                      Linking.openURL(settings.termsUrl).catch((err) =>
                        console.error("Failed to open Terms URL:", err)
                      );
                      return; // Stop execution here
                    }

                    if (item.screen === "PrivacyPolicy") {
                      Linking.openURL(settings.privacyPolicyUrl).catch((err) =>
                        console.error("Failed to open Privacy URL:", err)
                      );
                      return; // Stop execution here
                    }

                    // Navigate only if item.screen is defined and exists in your navigator
                    if (item.screen) {
                      navigation.navigate(item.screen);
                    }
                  }}
                >
                  <View style={styles.menuLeft}>
                    <Feather
                      name={item.icon}
                      size={16}
                      color={colors.secondary}
                    />
                    <Text style={styles.menuText}>{item.label}</Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.textLight}
                  />
                </TouchableOpacity>

                {index !== menuOptions.length - 1 && (
                  <View style={styles.menuDivider} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => handleLogout()}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={16} color={colors.danger} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  headerCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  enrollmentId: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
    marginVertical: 2,
  },
  joinDate: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  contactInfo: {
    gap: 6,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactText: {
    fontSize: 11,
    color: colors.textSecondary,
  },

  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },

  tabContainer: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },

  courseCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseImage: {
    width: "100%",
    height: 120,
  },
  courseContent: {
    padding: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  programText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "600",
    marginBottom: 6,
  },
  subjectsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 8,
  },
  subjectTag: {
    backgroundColor: colors.lightRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  subjectTagText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: "600",
  },
  moreSubjects: {
    fontSize: 9,
    color: colors.textSecondary,
    fontStyle: "italic",
    alignSelf: "center",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 6,
  },
  originalPrice: {
    fontSize: 10,
    color: colors.textLight,
    textDecorationLine: "line-through",
  },
  finalPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  couponBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.lightGreen,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  couponText: {
    fontSize: 8,
    color: colors.success,
    fontWeight: "600",
  },
  datesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 6,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dateText: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressBarBackground: {
    flex: 1,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.textSecondary,
  },

  emptyContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionCard: {
    width: (width - 48) / 3,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },

  menuCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  menuText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 6,
  },
  logoutText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: "600",
  },
});

export { colors };
