import messaging from '@react-native-firebase/messaging';
import * as ExpoNotifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const PermissionTypes = {
  NOTIFICATIONS: 'notifications',
  ACTIVITY: 'activity',
  CAMERA: 'camera',
  MEDIA_LIBRARY: 'media_library',
};

// ==================== FCM TOKEN MANAGEMENT ====================

export const getFCMToken = async () => {
  try {
    const isRegistered = await messaging().isDeviceRegisteredForRemoteMessages;

    if (!isRegistered) {
      await messaging().registerDeviceForRemoteMessages();
    }

    const token = await messaging().getToken();

    if (token) {
      console.log('📱 FCM Token:', token);
      await AsyncStorage.setItem('fcm_token', token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
};

export const refreshFCMToken = async (onTokenRefresh) => {
  try {
    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      console.log('🔄 FCM Token refreshed:', newToken);
      await AsyncStorage.setItem('fcm_token', newToken);

      if (onTokenRefresh && typeof onTokenRefresh === 'function') {
        await onTokenRefresh(newToken);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up token refresh:', error);
    return null;
  }
};

export const deleteFCMToken = async () => {
  try {
    await messaging().deleteToken();
    await AsyncStorage.removeItem('fcm_token');
    console.log('🗑️ FCM Token deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error);
    return false;
  }
};

// ==================== NOTIFICATION SETUP ====================

export const setupNotifications = async () => {
  try {
    const hasPermission = await requestNotificationPermission();

    if (!hasPermission) {
      return { success: false, message: 'Notification permission denied' };
    }

    const token = await getFCMToken();

    if (!token) {
      return { success: false, message: 'Failed to get FCM token' };
    }

    if (Platform.OS === 'android') {
      await setupNotificationChannels();
    }

    return {
      success: true,
      token,
      message: 'Notifications setup successfully',
    };
  } catch (error) {
    console.error('❌ Error setting up notifications:', error);
    return {
      success: false,
      message: 'Failed to setup notifications',
      error: error.message,
    };
  }
};

const requestNotificationPermission = async () => {
  try {
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications only work on physical devices');
      return false;
    }

    // iOS
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission({
        sound: true,
        alert: true,
        badge: true,
      });

      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    // Android
    if (Platform.OS === 'android') {
      // Android 13+
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Permission',
            message: 'We need your permission to send you important updates.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      // Android < 13
      const { status: existingStatus } =
        await ExpoNotifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await ExpoNotifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    }

    return false;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

const setupNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  try {
    await ExpoNotifications.setNotificationChannelAsync('default', {
      name: 'Default Notifications',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'n_bell',
    });

    await ExpoNotifications.setNotificationChannelAsync('attendance', {
      name: 'Attendance Alerts',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ef4444',
      sound: 'n_bell',
    });

    await ExpoNotifications.setNotificationChannelAsync('assignments', {
      name: 'Assignments & Tests',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#f59e0b',
      sound: 'v_bell',
    });

    await ExpoNotifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements',
      importance: ExpoNotifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10b981',
      sound: 'n_bell',
    });

    await ExpoNotifications.setNotificationChannelAsync('courses', {
      name: 'Course Updates',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8b5cf6',
      sound: 'v_bell',
    });

    await ExpoNotifications.setNotificationChannelAsync('tests', {
      name: 'Test & Live Class Alerts',
      importance: ExpoNotifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#06b6d4',
      sound: 'v_bell',
    });

    console.log('✅ Notification channels created');
  } catch (error) {
    console.error('❌ Error creating notification channels:', error);
  }
};

// ==================== FOREGROUND NOTIFICATIONS ====================

export const setupForegroundNotifications = (onNotificationReceived) => {
  try {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log('📩 Foreground notification:', remoteMessage);

      if (remoteMessage.notification) {
        await ExpoNotifications.scheduleNotificationAsync({
          content: {
            title: remoteMessage.notification.title,
            body: remoteMessage.notification.body,
            data: remoteMessage.data || {},
            sound: true,
            priority: ExpoNotifications.AndroidNotificationPriority.MAX,
            sticky: false,
            autoDismiss: true,
          },
          trigger: null,
        });
      }

      if (onNotificationReceived && typeof onNotificationReceived === 'function') {
        onNotificationReceived(remoteMessage);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up foreground notifications:', error);
    return null;
  }
};

// ==================== BACKGROUND NOTIFICATIONS ====================

export const setupBackgroundNotifications = () => {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('📩 Background notification:', remoteMessage);

    try {
      await AsyncStorage.setItem(
        'last_notification',
        JSON.stringify({
          ...remoteMessage,
          receivedAt: new Date().toISOString(),
        })
      );

      console.log('✅ Background notification handled');
    } catch (error) {
      console.error('❌ Error handling background notification:', error);
    }
  });
};

// ==================== NOTIFICATION INTERACTIONS ====================

export const setupNotificationOpenHandler = (onNotificationOpen) => {
  try {
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📱 Notification opened (background):', remoteMessage);

      if (onNotificationOpen && typeof onNotificationOpen === 'function') {
        onNotificationOpen(remoteMessage);
      }
    });

    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('📱 Notification opened (quit state):', remoteMessage);

          if (onNotificationOpen && typeof onNotificationOpen === 'function') {
            onNotificationOpen(remoteMessage);
          }
        }
      });

    const subscription =
      ExpoNotifications.addNotificationResponseReceivedListener((response) => {
        console.log('📱 Expo notification tapped:', response);

        if (onNotificationOpen && typeof onNotificationOpen === 'function') {
          const convertedMessage = {
            notification: {
              title: response.notification.request.content.title,
              body: response.notification.request.content.body,
            },
            data: response.notification.request.content.data || {},
          };
          onNotificationOpen(convertedMessage);
        }
      });

    return subscription;
  } catch (error) {
    console.error('❌ Error setting up notification open handler:', error);
    return null;
  }
};

// ==================== BADGE MANAGEMENT ====================

export const setBadgeCount = async (count) => {
  try {
    await ExpoNotifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('❌ Error setting badge count:', error);
  }
};

export const clearBadge = async () => {
  await setBadgeCount(0);
};

export const getBadgeCount = async () => {
  try {
    return await ExpoNotifications.getBadgeCountAsync();
  } catch (error) {
    console.error('❌ Error getting badge count:', error);
    return 0;
  }
};

// ==================== PERMISSION CHECKS ====================

export const checkPermission = async (permissionType) => {
  try {
    switch (permissionType) {
      case PermissionTypes.NOTIFICATIONS: {
        const authStatus = await messaging().hasPermission();
        return (
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      }

      case PermissionTypes.ACTIVITY: {
        if (Platform.OS === 'android' && Platform.Version >= 29) {
          const granted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
          );
          return granted;
        }
        return true;
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error checking ${permissionType} permission:`, error);
    return false;
  }
};

export const requestPermission = async (permissionType) => {
  try {
    switch (permissionType) {
      case PermissionTypes.NOTIFICATIONS:
        return await requestNotificationPermission();

      case PermissionTypes.ACTIVITY:
        return await requestActivityRecognition();

      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error requesting ${permissionType} permission:`, error);
    return false;
  }
};

// ==================== ACTIVITY RECOGNITION ====================

const requestActivityRecognition = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 29) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    {
      title: 'Physical Activity Permission',
      message: 'Track your study activity patterns and screen time.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    }
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

// ==================== HELPER FUNCTIONS ====================

export const openAppSettings = () => {
  Linking.openSettings();
};

export const getDeviceInfo = async () => {
  try {
    const deviceId = Device.modelName || Device.deviceName || 'Unknown';

    return {
      device_id: deviceId,
      platform: Platform.OS,
      os_version: Platform.Version.toString(),
    };
  } catch (error) {
    console.error('❌ Error getting device info:', error);
    return {
      device_id: Device.modelName || 'Unknown',
      platform: Platform.OS,
      os_version: Platform.Version.toString(),
    };
  }
};

// ==================== SCHEDULE LOCAL NOTIFICATION ====================

export const scheduleLocalNotification = async (
  title,
  body,
  data = {},
  trigger = null
) => {
  try {
    await ExpoNotifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
        priority: ExpoNotifications.AndroidNotificationPriority.MAX,
        sticky: false,
        autoDismiss: true,
      },
      trigger: trigger || null,
    });

    console.log('📬 Local notification scheduled');
  } catch (error) {
    console.error('❌ Error scheduling local notification:', error);
  }
};

// ==================== CANCEL NOTIFICATIONS ====================

export const cancelAllNotifications = async () => {
  try {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
    console.log('🗑️ All scheduled notifications cancelled');
  } catch (error) {
    console.error('❌ Error cancelling notifications:', error);
  }
};

export const cancelNotification = async (notificationId) => {
  try {
    await ExpoNotifications.cancelScheduledNotificationAsync(notificationId);
    console.log('🗑️ Notification cancelled:', notificationId);
  } catch (error) {
    console.error('❌ Error cancelling notification:', error);
  }
};

// ==================== GET ALL NOTIFICATIONS ====================

export const getAllScheduledNotifications = async () => {
  try {
    const notifications =
      await ExpoNotifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('❌ Error getting scheduled notifications:', error);
    return [];
  }
};
