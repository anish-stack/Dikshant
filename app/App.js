import { usePreventScreenCapture } from 'expo-screen-capture';
import useFontStyle from "./hooks/useFontLoad";
import { Text, TextInput, Alert, AppState, StyleSheet, View, Modal, TouchableOpacity } from "react-native";
import { useEffect, useState, useRef } from "react";
import * as ExpoNotifications from "expo-notifications";
import * as Updates from 'expo-updates';
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "./constant/api";
import { useAuthStore } from "./stores/auth.store";
import { SocketProvider } from "./context/SocketContext";
import { colors } from "./constant/color";
import { isDeveloperOptionsEnabled } from "./utils/deviceChecks";
import {
  setupNotifications,
  setupBackgroundNotifications,
  setupForegroundNotifications,
  setupNotificationOpenHandler,
  refreshFCMToken,
  getDeviceInfo,
} from "./utils/permissions";
import AppRouter from "./src/navigation/AppRouter";

ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

setupBackgroundNotifications();

export default function App() {
  usePreventScreenCapture();
  const fontsLoaded = useFontStyle();
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationData, setNotificationData] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [showDevWarning, setShowDevWarning] = useState(false);
  const [isDevOptionsEnabled, setIsDevOptionsEnabled] = useState(false);
  const { token, user } = useAuthStore();
  const fcmUnsubscribe = useRef();
  const navigationRef = useRef();

  useEffect(() => {
    initializeApp();

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription?.remove();
      fcmUnsubscribe.current?.();
    };
  }, []);

  const initializeApp = async () => {
    try {
      await checkForUpdates();
      await initializeNotifications();
      setupExpoNotificationListeners();
    } catch (error) {
      console.error("Error initializing app:", error);
    }
  };

  const checkForUpdates = async () => {
    if (__DEV__) return;

    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();

        Alert.alert(
          "Update Ready",
          "A new version has been downloaded. Restart to apply?",
          [
            {
              text: "Restart Now",
              onPress: async () => await Updates.reloadAsync(),
            },
            { text: "Later", style: "cancel" },
          ]
        );
      }
    } catch (error) {
      console.error("Update check failed:", error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === "active") {
      checkForUpdates();
    }
  };

  const setupExpoNotificationListeners = () => {
    ExpoNotifications.addNotificationReceivedListener((notification) => {
      // Can be used later if needed
    });

    ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      handleNotificationData(data);
    });
  };

  const updateFcmTokenAPI = async ({ fcm_token, device_id, platform }) => {
    try {
      await axios.post(
        `${API_URL_LOCAL_ENDPOINT}/auth/update-fcm-token`,
        { fcm_token, device_id, platform },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.log("FCM token update failed:", error.response?.data);
    }
  };

  const initializeNotifications = async () => {
    try {
      const result = await setupNotifications();

      if (result.success) {
        setFcmToken(result.token);

        const deviceInfo = await getDeviceInfo();

        await updateFcmTokenAPI({
          fcm_token: result.token,
          device_id: deviceInfo.device_id,
          platform: deviceInfo.platform,
        });

        fcmUnsubscribe.current = await refreshFCMToken(async (newToken) => {
          setFcmToken(newToken);
          await updateFcmTokenAPI({ fcm_token: newToken });
        });

        setupForegroundNotifications((remoteMessage) => {
          if (remoteMessage.notification) {
            Alert.alert(
              remoteMessage.notification.title || "Notification",
              remoteMessage.notification.body || "",
              [{ text: "OK", onPress: () => handleNotificationData(remoteMessage.data) }]
            );
          }
        });

        setupNotificationOpenHandler((remoteMessage) => {
          handleNotificationData(remoteMessage.data);
        });

        setPermissionsGranted(true);
      } else {
        setPermissionsGranted(true);
      }
    } catch (error) {
      console.error("Notifications init failed:", error);
      setPermissionsGranted(true);
    }
  };

  const handleNotificationData = (data) => {
    if (!data) return;
    setNotificationData(data);

    if (!navigationRef.current?.isReady()) return;

    switch (data.type) {
      case "course":
        if (data.course_id) {
          navigationRef.current.navigate("CourseDetail", { courseId: data.course_id });
        }
        break;

      case "test":
      case "quiz":
        if (data.test_id) {
          navigationRef.current.navigate("Quiz", { testId: data.test_id });
        }
        break;

      case "assignment":
        if (data.assignment_id) {
          navigationRef.current.navigate("Assignments", { assignmentId: data.assignment_id });
        }
        break;

      case "announcement":
        navigationRef.current.navigate("Notifications");
        break;

      case "scholarship":
        if (data.scholarship_id) {
          navigationRef.current.navigate("apply-sch");
        }
        break;

      default:
        if (data.screen) {
          navigationRef.current.navigate(data.screen);
        } else {
          navigationRef.current.navigate("Notifications");
        }
    }
  };

  const checkDeveloperOptions = async () => {
    const enabled = await isDeveloperOptionsEnabled();
    setIsDevOptionsEnabled(enabled);
    if (enabled) setShowDevWarning(true);
  };

  useEffect(() => {
    checkDeveloperOptions();

    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") checkDeveloperOptions();
    });

    return () => sub?.remove();
  }, []);

  if (!fontsLoaded || !permissionsGranted) {
    return null;
  }

  if (isDevOptionsEnabled) {
    return (
      <Modal
        visible={showDevWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDevWarning(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.warningCard}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningTitle}>Developer Options Enabled</Text>
            <Text style={styles.warningMessage}>
              आपने अपने फोन में Developer Options ऑन कर रखा है।{"\n\n"}
              यह ऐप की security और performance को प्रभावित कर सकता है।{"\n\n"}
              कृपया इसे बंद कर दें:
            </Text>

            <View style={styles.steps}>
              <Text style={styles.stepText}>1. Settings → About Phone</Text>
              <Text style={styles.stepText}>2. Build Number पर 7 बार टैप करें (बंद करने के लिए)</Text>
              <Text style={styles.stepText}>3. Developer Options को ऑफ करें</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDevWarning(false)}
            >
              <Text style={styles.closeButtonText}>समझ गया, बंद करूंगा</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  Text.defaultProps = { ...Text.defaultProps, style: { fontFamily: "Geist" } };
  TextInput.defaultProps = { ...TextInput.defaultProps, style: { fontFamily: "Geist" } };

  return (
    <SocketProvider userId={user?.id}>
      <AppRouter
        navigationRef={navigationRef}
        handleNotificationData={handleNotificationData}
      />
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  warningCard: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },
  warningIcon: {
    fontSize: 50,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#D32F2F",
    marginBottom: 12,
    textAlign: "center",
  },
  warningMessage: {
    fontSize: 15,
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 16,
  },
  steps: {
    alignSelf: "stretch",
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  stepText: {
    fontSize: 14,
    color: "#E65100",
    marginVertical: 4,
  },
  closeButton: {
    backgroundColor: colors.primary || "#1976D2",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});