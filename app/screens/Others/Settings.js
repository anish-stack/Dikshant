import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Layout from "../../components/layout";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import styles from "./commonStyle";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";

export function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [downloadQuality, setDownloadQuality] = useState("HD");

  // Trigger haptic feedback
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  // Update user settings via API
  const updateUserSetting = async (key, value) => {
    try {
      await axios.post(`${API_URL_LOCAL_ENDPOINT}/userSetting`, {
        [key]: value,
      });
    } catch (error) {
      console.error("❌ Failed to update setting:", key, error);
    }
  };

  // Check notification permission before enabling
  const togglePushNotification = async (value) => {
    triggerHaptic();

    if (!value) {
      setPushNotifications(false);
      updateUserSetting("pushNotifications", false);
      return;
    }

    // Check permission
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: newStatus } =
        await Notifications.requestPermissionsAsync();
      if (newStatus !== "granted") {
        Alert.alert(
          "Permission required",
          "Please enable notifications in system settings to receive push notifications"
        );
        return;
      }
    }

    setPushNotifications(true);
    updateUserSetting("pushNotifications", true);
  };

  // Generic toggle handler
  const handleToggle = (setter, key, value) => {
    triggerHaptic();
    setter(!value);
    updateUserSetting(key, !value);
  };

  // Download quality options
  const showQualityOptions = () => {
    triggerHaptic();
    Alert.alert("Download Quality", "Choose video download quality", [
      {
        text: "SD",
        onPress: () => {
          setDownloadQuality("SD");
          updateUserSetting("downloadQuality", "SD");
        },
      },
      {
        text: "HD",
        onPress: () => {
          setDownloadQuality("HD");
          updateUserSetting("downloadQuality", "HD");
        },
      },
      {
        text: "Full HD",
        onPress: () => {
          setDownloadQuality("Full HD");
          updateUserSetting("downloadQuality", "Full HD");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Clear app cache
  const handleClearCache = async () => {
    triggerHaptic();
    Alert.alert("Clear Cache", "This will clear all cached data. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          try {
            await axios.get(`https://www.dikapi.olyox.in/flush-all`);
            Alert.alert("Cache cleared successfully");
          } catch (error) {
            console.error("❌ Clear cache failed", error);
          }
        },
      },
    ]);
  };

  const settingsSections = [
    {
      title: "Notifications",
      icon: "bell",
      items: [
        {
          label: "Push Notifications",
          description: "Receive notifications on your device",
          value: pushNotifications,
          onToggle: () => togglePushNotification(pushNotifications),
        },
        {
          label: "Email Notifications",
          description: "Receive updates via email",
          value: emailNotifications,
          onToggle: () =>
            handleToggle(
              setEmailNotifications,
              "emailNotifications",
              emailNotifications
            ),
        },
        {
          label: "WhatsApp Notifications",
          description: "Receive updates via WhatsApp",
          value: whatsappNotifications,
          onToggle: () =>
            handleToggle(
              setWhatsappNotifications,
              "whatsappNotifications",
              whatsappNotifications
            ),
        },
      ],
    },

    {
      title: "Video Playback",
      icon: "play-circle",
      items: [
        {
          label: "Auto-Play Videos",
          description: "Automatically play next video",
          value: autoPlay,
          onToggle: () => handleToggle(setAutoPlay, "autoPlay", autoPlay),
        },
      ],
    },
  ];

  const actionItems = [
    {
      icon: "download",
      label: "Download Quality",
      value: downloadQuality,
      onPress: showQualityOptions,
    },
    {
      icon: "trash-2",
      label: "Clear Cache",
      danger: true,
      onPress: handleClearCache,
    },
  ];

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, idx) => (
          <View key={idx} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name={section.icon} size={18} color="#DC3545" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            <View style={styles.card}>
              {section.items.map((item, itemIdx) => (
                <View
                  key={itemIdx}
                  style={[
                    styles.settingItem,
                    itemIdx !== section.items.length - 1 &&
                      styles.settingItemBorder,
                  ]}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>{item.label}</Text>
                    <Text style={styles.settingDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: "#cbd5e1", true: "#DC3545" }}
                    thumbColor={item.value ? "#DC3545" : "#f1f5f9"}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Action Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Feather name="sliders" size={18} color="#DC3545" />
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <View style={styles.card}>
            {actionItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.actionItem,
                  idx !== actionItems.length - 1 && styles.settingItemBorder,
                ]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.actionLeft}>
                  <View
                    style={[
                      styles.actionIcon,
                      item.danger && styles.dangerIcon,
                    ]}
                  >
                    <Feather
                      name={item.icon}
                      size={20}
                      color={item.danger ? "#ef4444" : "#DC3545"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.actionLabel,
                      item.danger && styles.dangerText,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                {item.value && (
                  <Text style={styles.actionValue}>{item.value}</Text>
                )}
                <Feather name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}
