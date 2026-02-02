import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Layout from '../../components/layout';
import * as Haptics from 'expo-haptics';
import {
  PermissionTypes,
  checkPermission,
  requestPermission,
  openAppSettings,
} from '../../utils/permissions';

export default function PermissionsScreen() {
  const [permissions, setPermissions] = useState({
    notifications: false,
    location: false,
    activity: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAllPermissions();
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const checkAllPermissions = async () => {
    const notif = await checkPermission(PermissionTypes.NOTIFICATIONS);
    const loc = await checkPermission(PermissionTypes.LOCATION);
    const activity = await checkPermission(PermissionTypes.ACTIVITY);

    setPermissions({
      notifications: notif,
      location: loc,
      activity: activity,
    });
  };

  const handlePermissionToggle = async (permissionType) => {
    triggerHaptic();
    setLoading(true);

    const currentStatus = permissions[permissionType];

    if (currentStatus) {
      // Already granted, open settings to disable
      Alert.alert(
        "Manage Permission",
        `To disable ${permissionType} permission, please go to Settings.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: openAppSettings },
        ]
      );
    } else {
      // Request permission
      const granted = await requestPermission(
        PermissionTypes[permissionType.toUpperCase()]
      );
      setPermissions((prev) => ({
        ...prev,
        [permissionType]: granted,
      }));
    }

    setLoading(false);
  };

  const permissionsList = [
    {
      key: 'notifications',
      icon: 'bell',
      title: 'Push Notifications',
      description: 'Receive updates about courses, tests, and achievements',
      color: '#DC3545',
      required: true,
    },
    {
      key: 'location',
      icon: 'map-pin',
      title: 'Location Access',
      description: 'Find nearby test centers and local study groups',
      color: '#10b981',
      required: false,
    },
    {
      key: 'activity',
      icon: 'activity',
      title: 'Physical Activity',
      description: 'Track study patterns and screen time for better habits',
      color: '#f59e0b',
      required: false,
      androidOnly: true,
    },
  ];

  const filteredPermissions = permissionsList.filter(
    (perm) => !perm.androidOnly || Platform.OS === 'android'
  );

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Feather name="shield" size={32} color="#DC3545" />
          </View>
          <Text style={styles.headerTitle}>App Permissions</Text>
          <Text style={styles.headerSubtitle}>
            Manage permissions to enhance your learning experience
          </Text>
        </View>

        {/* Info Card */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <Feather name="info" size={20} color="#3b82f6" />
            <Text style={styles.infoText}>
              We respect your privacy. Permissions are only used to provide better
              features and can be disabled anytime.
            </Text>
          </View>
        </View>

        {/* Permissions List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <View style={styles.card}>
            {filteredPermissions.map((permission, idx) => (
              <View
                key={permission.key}
                style={[
                  styles.permissionItem,
                  idx !== filteredPermissions.length - 1 && styles.borderBottom,
                ]}
              >
                <View
                  style={[
                    styles.permissionIcon,
                    { backgroundColor: permission.color + '20' },
                  ]}
                >
                  <Feather
                    name={permission.icon}
                    size={24}
                    color={permission.color}
                  />
                </View>

                <View style={styles.permissionContent}>
                  <View style={styles.permissionHeader}>
                    <Text style={styles.permissionTitle}>
                      {permission.title}
                    </Text>
                    {permission.required && (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredText}>Required</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.permissionDescription}>
                    {permission.description}
                  </Text>
                </View>

                <Switch
                  value={permissions[permission.key]}
                  onValueChange={() => handlePermissionToggle(permission.key)}
                  disabled={loading}
                  trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
                  thumbColor={
                    permissions[permission.key] ? permission.color : '#f1f5f9'
                  }
                />
              </View>
            ))}
          </View>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why We Need These</Text>
          <View style={styles.benefitsContainer}>
            {[
              {
                icon: 'bell',
                title: 'Stay Updated',
                description: 'Never miss important course updates and test reminders',
              },
              {
                icon: 'map-pin',
                title: 'Find Nearby',
                description: 'Discover test centers and study groups near you',
              },
              {
                icon: 'trending-up',
                title: 'Track Progress',
                description: 'Monitor your study habits and improve productivity',
              },
              {
                icon: 'shield',
                title: 'Privacy First',
                description: 'Your data is secure and never shared with third parties',
              },
            ].map((benefit, idx) => (
              <View key={idx} style={styles.benefitCard}>
                <View style={styles.benefitIcon}>
                  <Feather name={benefit.icon} size={20} color="#DC3545" />
                </View>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>
                  {benefit.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {
              triggerHaptic();
              openAppSettings();
            }}
            activeOpacity={0.8}
          >
            <Feather name="settings" size={20} color="#DC3545" />
            <Text style={styles.settingsButtonText}>Open System Settings</Text>
            <Feather name="external-link" size={18} color="#DC3545" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    padding: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },

  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },

  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  permissionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  requiredBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  requiredText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  permissionDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },

  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  benefitCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  benefitDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },

  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#DC3545',
  },
  settingsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC3545',
  },
});