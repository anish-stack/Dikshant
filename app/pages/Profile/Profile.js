import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/auth.store';
import { useSettings } from '../../hooks/useSettings';
import Layout from '../../components/layout';

const colors = {
  primary: "#DC2626",
  text: "#111827",
  textSecondary: "#4B5563",
  textLight: "#6B7280",
  border: "#E5E7EB",
  surface: "#F9FAFB",
  danger: "#EF4444",
};

const quickActions = [
  { 
    label: "My Courses", 
    icon: "book-open", 
    bg: "#E0E7FF", 
    color: "#6366F1", 
    screen: "all-my-course" 
  },
  { 
    label: "Quizzes", 
    icon: "help-circle-outline", 
    bg: "#DCFCE7", 
    color: "#22C55E", 
    screen: "all-my-quiz" // ya jo bhi tera quiz list screen hai
  },
  { 
    label: "Test Series", 
    icon: "file-text", 
    bg: "#FEF3C7", 
    color: "#F59E0B", 
    screen: "TestSeries" // tera test series screen name daal dena
  },
  { 
    label: "Settings", 
    icon: "settings", 
    bg: "#DBEAFE", 
    color: "#3B82F6", 
    screen: "Settings" 
  },
  { 
    label: "Share App", 
    icon: "share-2", 
    bg: "#E0E7FF", 
    color: "#6366F1", 
    action: "share" 
  },
  { 
    label: "Rate Us", 
    icon: "star", 
    bg: "#FEF3C7", 
    color: "#F59E0B", 
    action: "rate" 
  },
  { 
    label: "Scholarships", 
    icon: "award", 
    bg: "#DCFCE7", 
    color: "#22C55E", 
    screen: "apply-sch" 
  },
  { 
    label: "Offers", 
    icon: "gift", 
    bg: "#FEE2E2", 
    color: "#EF4444", 
    screen: "Offers" 
  },
  { 
    label: "Help & Support", 
    icon: "help-circle", 
    bg: "#FCE7F3", 
    color: "#EC4899", 
    screen: "HelpSupport" 
  },
];
const menuOptions = [
  { label: "Notifications", icon: "bell", screen: "Notifications" },
  { label: "Terms & Conditions", icon: "file-text", urlKey: "termsUrl" },
  { label: "Privacy Policy", icon: "shield", urlKey: "privacyPolicyUrl" },
];

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function Profile() {
  const { user, logout } = useAuthStore();
  const navigation = useNavigation();
  const { settings } = useSettings();

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleLogout = async () => {
    await logout(navigation);
  };

  const handleQuickAction = (item) => {
    triggerHaptic();
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.action === "share") {
      // Add share logic later
    } else if (item.action === "rate") {
      // Add rate logic later
    }
  };

  const handleMenuPress = (item) => {
    triggerHaptic();
    if (item.urlKey && settings[item.urlKey]) {
      Linking.openURL(settings[item.urlKey]).catch(() => {});
    } else if (item.screen) {
      navigation.navigate(item.screen);
    }
  };

  return (
    <Layout isHeaderShow={true}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>

          <Text style={styles.name}>{user?.name || "Student"}</Text>
          <Text style={styles.id}>ID: DIKSHANT{user?.id || ""}</Text>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Feather name="mail" size={14} color={colors.textLight} />
              <Text style={styles.detailText}>{user?.email || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="phone" size={14} color={colors.textLight} />
              <Text style={styles.detailText}>{user?.mobile || "N/A"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={14} color={colors.textLight} />
              <Text style={styles.detailText}>
                Joined {formatDate(user?.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionItem}
                onPress={() => handleQuickAction(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.actionIcon, { backgroundColor: item.bg }]}>
                  <Feather name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.actionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* More Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>More Options</Text>
          <View style={styles.menuList}>
            {menuOptions.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item)}
                activeOpacity={0.8}
              >
                <View style={styles.menuLeft}>
                  <Feather name={item.icon} size={18} color={colors.textSecondary} />
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textLight} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  profileCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  id: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  details: {
    width: '100%',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionItem: {
    width: '31%',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  menuList: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  logoutBtn: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
});