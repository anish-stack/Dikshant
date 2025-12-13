import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import useFontStyle from "./hooks/useFontLoad";
import Splash from "./screens/splash/splash";
import Login from "./screens/auth/Login";
import Home from "./pages/Home/Home";
import { StatusBar } from "expo-status-bar";
import Signup from "./screens/auth/Signup";
import CourseDetail from "./screens/courses/CourseDetail";
import Course from "./screens/courses/Courses";
import CoursePage from "./screens/courses/CoursePage";
import { Text, TextInput, Alert, AppState } from "react-native";
import EBooks from "./pages/Books/EBooks";
import TestScreen from "./screens/Tests/Tests";
import QuesAndScreen from "./screens/Tests/QuesAndScreen";
import Profile from "./pages/Profile/Profile";
import Downloads from "./pages/Downloads/Downloads";
import RecordedCourses from "./pages/RecordedCourses/RecordedCourses";
import TestSeries from "./pages/TestSeries/TestSeries";
import { Settings } from "./screens/Others/Settings";
import { HelpSupport } from "./screens/Others/HelpSupport";
import { About } from "./screens/Others/About";
import Notifications from "./screens/Others/Notifications";
import PermissionsScreen from "./screens/Others/PermissionsScreen";
import { useEffect, useState, useRef } from "react";
import * as ExpoNotifications from "expo-notifications";
import * as Location from "expo-location";
import { Platform } from "react-native";
import Scholarship from "./pages/Scholarship/AllScholarship";
import ApplyScholarship from "./pages/Scholarship/ApplyScholarship";
import EnrollCourse from "./screens/courses/EnrollCourse";
import MyEnrollCourse from "./pages/Profile/MyEnrollCourse";
import {
  setupNotifications,
  setupBackgroundNotifications,
  setupForegroundNotifications,
  setupNotificationOpenHandler,
  refreshFCMToken,
  getDeviceInfo,
} from "./utils/permissions";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "./constant/api";
import { useAuthStore } from "./stores/auth.store";
import {
  HelpSupportScreen,
  RateUsScreen,
  ShareAppScreen,
} from "./pages/Profile/ShareApp";
import ForgotPassword from "./screens/auth/ForgotPassword";

const Stack = createNativeStackNavigator();

// Configure Expo Notifications handler
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Setup FCM background handler (MUST be at top level)
setupBackgroundNotifications();

export default function App() {
  const fontsLoaded = useFontStyle();
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationData, setNotificationData] = useState(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const fcmUnsubscribe = useRef();
  const appState = useRef(AppState.currentState);
  const navigationRef = useRef();
  const { token } = useAuthStore();
  useEffect(() => {
    initializeApp();

    // Monitor app state for screen time tracking
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      // Cleanup listeners
      subscription?.remove();
      notificationListener.current?.remove();
      responseListener.current?.remove();
      fcmUnsubscribe.current?.();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize FCM and notifications
      await initializeNotifications();

      // Setup Expo notification listeners
      setupExpoNotificationListeners();
    } catch (error) {
      console.error("❌ Error initializing app:", error);
    }
  };

  const handleAppStateChange = (nextAppState) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("App has come to the foreground!");
      // You can track session start time here
    } else if (
      appState.current === "active" &&
      nextAppState.match(/inactive|background/)
    ) {
      console.log("App has gone to the background!");
      // You can track session end time here
    }
    appState.current = nextAppState;
  };

  const setupExpoNotificationListeners = () => {
    // Handle notifications when app is in foreground
    notificationListener.current =
      ExpoNotifications.addNotificationReceivedListener((notification) => {
        console.log("📩 Expo notification received:", notification);
      });

    // Handle notification taps (Expo)
    responseListener.current =
      ExpoNotifications.addNotificationResponseReceivedListener((response) => {
        console.log("📱 Expo notification tapped:", response);
        const data = response.notification.request.content.data;
        handleNotificationData(data);
      });
  };

  const updateFcmTokenAPI = async ({ fcm_token, device_id, platform }) => {
    try {
      const res = await axios.post(
        `${API_URL_LOCAL_ENDPOINT}/auth/update-fcm-token`,
        {
          fcm_token,
          device_id,
          platform,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Server update  token", res.data);
    } catch (error) {
      console.log("server error", error.response.data);
    }
  };

  const initializeNotifications = async () => {
    try {
      console.log("🚀 Initializing FCM notifications...");

      // 1. Setup notifications and get FCM token
      const result = await setupNotifications();

      if (result.success) {
        console.log("✅ FCM setup successful");
        setFcmToken(result.token);

        // 2. Get device info
        const deviceInfo = await getDeviceInfo();
        console.log("📱 Device info:", deviceInfo);

        // 3. TODO: Send FCM token to your backend
        await updateFcmTokenAPI({
          fcm_token: result.token,
          device_id: deviceInfo.device_id,
          platform: deviceInfo.platform,
        });

        // 4. Setup token refresh listener
        fcmUnsubscribe.current = await refreshFCMToken(async (newToken) => {
          console.log("🔄 Token refreshed:", newToken);
          setFcmToken(newToken);

          // TODO: Update token on backend
          await updateFcmTokenAPI({ fcm_token: newToken });
        });

        // 5. Setup foreground notification handler
        setupForegroundNotifications((remoteMessage) => {
          console.log("📩 FCM foreground notification:", remoteMessage);

          // Show alert if needed
          if (remoteMessage.notification) {
            Alert.alert(
              remoteMessage.notification.title || "Notification",
              remoteMessage.notification.body || "",
              [
                {
                  text: "OK",
                  onPress: () => handleNotificationData(remoteMessage.data),
                },
              ]
            );
          }
        });

        // 6. Setup notification open handler (when user taps notification)
        setupNotificationOpenHandler((remoteMessage) => {
          console.log("📱 User opened notification:", remoteMessage);
          handleNotificationData(remoteMessage.data);
        });

        setPermissionsGranted(true);
      } else {
        console.error("❌ FCM setup failed:", result.message);
        // Continue with app even if FCM fails
        setPermissionsGranted(true);
      }
    } catch (error) {
      console.error("❌ Error initializing notifications:", error);
      setPermissionsGranted(true);
    }
  };

  const handleNotificationData = (data) => {
    if (!data) return;

    console.log("🔔 Processing notification data:", data);
    setNotificationData(data);

    // Navigate based on notification type
    if (navigationRef.current?.isReady()) {
      switch (data.type) {
        case "course":
          if (data.course_id) {
            navigationRef.current.navigate("CourseDetail", {
              courseId: data.course_id,
            });
          }
          break;

        case "test":
        case "quiz":
          if (data.test_id) {
            navigationRef.current.navigate("Quiz", {
              testId: data.test_id,
            });
          }
          break;

        case "assignment":
          if (data.assignment_id) {
            // Navigate to assignments screen
            navigationRef.current.navigate("Assignments", {
              assignmentId: data.assignment_id,
            });
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
          // Navigate to screen if specified
          if (data.screen) {
            navigationRef.current.navigate(data.screen);
          } else {
            navigationRef.current.navigate("Notifications");
          }
      }
    }
  };

  if (!fontsLoaded || !permissionsGranted) {
    return null;
  }

  // Apply Geist font globally
  Text.defaultProps = Text.defaultProps || {};
  Text.defaultProps.style = { fontFamily: "Geist" };

  TextInput.defaultProps = TextInput.defaultProps || {};
  TextInput.defaultProps.style = { fontFamily: "Geist" };

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Signup" component={Signup} />
        <Stack.Screen name="Home" component={Home} />

        <Stack.Screen name="ShareApp" component={ShareAppScreen} />
        <Stack.Screen name="RateUs" component={RateUsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />

        <Stack.Screen name="ForgotPassword" component={ForgotPassword} />

        <Stack.Screen name="CourseDetail" component={CourseDetail} />
        <Stack.Screen name="Courses" component={CoursePage} />
        <Stack.Screen name="enroll-course" component={EnrollCourse} />
        <Stack.Screen name="my-course" component={MyEnrollCourse} />

        <Stack.Screen name="EBooks" component={EBooks} />
        <Stack.Screen name="Quiz" component={TestScreen} />
        <Stack.Screen name="startQuz" component={QuesAndScreen} />
        <Stack.Screen name="Profile" component={Profile} />
        <Stack.Screen name="Downloads" component={Downloads} />
        <Stack.Screen name="RecordedCourses" component={RecordedCourses} />
        <Stack.Screen name="TestSeries" component={TestSeries} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="Support" component={HelpSupport} />
        <Stack.Screen name="About" component={About} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="Permissions" component={PermissionsScreen} />
        <Stack.Screen name="apply-sch" component={Scholarship} />
        <Stack.Screen name="ApplyScholarship" component={ApplyScholarship} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
