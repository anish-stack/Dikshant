import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  AppState,
  BackHandler,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import axios from "axios";
import { useSettings } from "../../hooks/useSettings";
import * as ScreenOrientation from "expo-screen-orientation";

const API_BASE = "http://192.168.1.7:5001/api/chat";
const JOIN_API = `${API_BASE}/Student-join-api`;
const LEAVE_API = `${API_BASE}/Student-Leave-api`;

const MIN_LOADING_TIME = 3500;

const injectedConsoleJS = `
(function () {
  if (window.__consoleInjected) return;
  window.__consoleInjected = true;
  function send(type, args) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type,
        message: Array.from(args).map(a =>
          typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ')
      })
    );
  }
  console.log = function () { send('log', arguments); };
  console.warn = function () { send('warn', arguments); };
  console.error = function () { send('error', arguments); };
})();
true;
`;

// ── Helper: restore screen to normal portrait mode ──────────────────────────
const resetToPortrait = async () => {
  try {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP
    );
    StatusBar.setHidden(false, "fade");
    StatusBar.setBarStyle("light-content", true);
  } catch (err) {
    console.warn("[PlayerScreen] resetToPortrait error:", err);
  }
};

const PlayerScreen = ({ route, navigation }) => {
  const { settings } = useSettings();
  const { video, batchId, userId, token, courseId, isDemo, videoId } =
    route.params || {};
  const playerUrl = `https://www.player.dikshantias.com/?video=${video}&batchId=${batchId}&userId=${userId}&token=${token}&courseId=${courseId}`;

  const [pageLoaded, setPageLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // ─── Join / Leave Functions ─────────────────────────────────────────
  const joinChat = useCallback(async () => {
    if (!videoId || !userId || hasJoined) return;
    try {
      const payload = { videoId, userId: String(userId) };
      const { data } = await axios.post(JOIN_API, payload, { timeout: 7000 });
      console.log("✅ Joined chat successfully", data);
      setHasJoined(true);
    } catch (err) {
      console.warn("Join chat failed:", err?.response?.data || err.message);
    }
  }, [videoId, userId, hasJoined]);

  const leaveChat = useCallback(async () => {
    if (!hasJoined) return;
    try {
      const payload = { videoId, userId: String(userId) };
      await axios.post(LEAVE_API, payload, { timeout: 7000 });
      console.log("✅ Left chat successfully");
      setHasJoined(false);
    } catch (err) {
      console.warn("Leave chat failed:", err?.message);
    }
  }, [hasJoined, videoId, userId]);

  // ─── Confirmation Alert ─────────────────────────────────────────────
  const showLeaveConfirmation = useCallback(() => {
    return new Promise((resolve) => {
      Alert.alert(
        "Class has not ended yet",
        "Do you want to leave the class?",
        [
          { text: "No, Stay", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Yes, Leave",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }, []);

  // ─── Centralized canLeave function ──────────────────────────────────
  const attemptLeave = useCallback(async () => {
    if (!hasJoined) return true;
    const userConfirmed = await showLeaveConfirmation();
    if (userConfirmed) {
      await leaveChat();
      return true;
    }
    return false;
  }, [hasJoined, showLeaveConfirmation, leaveChat]);

  // ─── Prevent back navigation without confirmation ───────────────────
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", async (e) => {
      const canProceed = await attemptLeave();
      if (!canProceed) {
        e.preventDefault();
        return;
      }
      // ✅ User is leaving screen — reset orientation & status bar
      await resetToPortrait();
    });

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      async () => {
        const canProceed = await attemptLeave();
        if (canProceed) {
          // ✅ Reset orientation before going back
          await resetToPortrait();
          navigation.goBack();
          return true;
        }
        return true;
      }
    );

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation, attemptLeave]);

  // ─── Reset orientation when component unmounts ──────────────────────
  useEffect(() => {
    return () => {
      // ✅ Always reset when this screen is destroyed
      resetToPortrait();
    };
  }, []);

  // ─── Auto join on mount / params change ─────────────────────────────
  useEffect(() => {
    if (video && videoId && userId) joinChat();
    return () => { leaveChat(); };
  }, [video, videoId, userId]);

  // ─── App state handling (background/foreground) ─────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        if (video && videoId && userId && !hasJoined) joinChat();
      } else if (nextAppState.match(/inactive|background/) && hasJoined) {
        leaveChat();
      }
      appStateRef.current = nextAppState;
    });
    return () => subscription.remove();
  }, [video, videoId, userId, hasJoined, joinChat, leaveChat]);

  // ─── Pause video when app backgrounds ───────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        webViewRef.current?.injectJavaScript(`
          const v = document.querySelector("video");
          if (v) v.pause();
          true;
        `);
      }
    });
    return () => sub.remove();
  }, []);

  // ─── Minimum loading timer ──────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

  // ─── Shimmer animation ──────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, [shimmerAnim]);

  // ─── Hide loader when ready ─────────────────────────────────────────
  useEffect(() => {
    if (pageLoaded && minTimePassed) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [pageLoaded, minTimePassed, fadeAnim]);

  // ─── Retry handler ──────────────────────────────────────────────────
  const handleRetry = () => {
    setHasError(false);
    setPageLoaded(false);
    setMinTimePassed(false);
    fadeAnim.setValue(1);
    setTimeout(() => setMinTimePassed(true), MIN_LOADING_TIME);
    webViewRef.current?.reload();
  };

  // ─── WebView message handler ─────────────────────────────────────────
  const handleMessage = useCallback(async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "fullscreenRequest") {
        // ✅ Go landscape + hide status bar
        console.log("📲 Fullscreen request received");
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
        StatusBar.setHidden(true, "fade");
      }


      else if (data.type === "exitfromFullScreen") {
        // ✅ WebView can also request to go back to portrait
        await resetToPortrait();
      }

      else if (data.type === "log") {
        console.log("[WebView LOG]:", data.message);
      }
      else if (data.type === "warn") {
        console.warn("[WebView WARN]:", data.message);
      }
      else if (data.type === "error") {
        console.error("[WebView ERROR]:", data.message);
      }
    } catch (err) {
      console.log("[WebView RAW]:", event.nativeEvent.data);
    }
  }, []);

  // ─── Listen for device rotation to auto-exit fullscreen ─────────────
  useEffect(() => {
    const sub = ScreenOrientation.addOrientationChangeListener((evt) => {
      const orientation = evt.orientationInfo.orientation;
      // ScreenOrientation values: 1=PORTRAIT_UP, 2=PORTRAIT_DOWN, 3=LANDSCAPE_LEFT, 4=LANDSCAPE_RIGHT
      const isPortrait =
        orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
        orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN;

      if (isPortrait) {
        // ✅ User physically rotated back to portrait — restore UI
        StatusBar.setHidden(false, "fade");
        StatusBar.setBarStyle("light-content", true);
        // Notify WebView so it can update its UI state too
        webViewRef.current?.injectJavaScript(`
          window.dispatchEvent(new Event('resize'));
          true;
        `);
      }
    });

    return () => ScreenOrientation.removeOrientationChangeListener(sub);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* WebView */}
        {!hasError && (
          <WebView
            ref={webViewRef}
            source={{ uri: playerUrl }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            androidLayerType="hardware"
            mixedContentMode="compatibility"
            thirdPartyCookiesEnabled={true}
            injectedJavaScriptBeforeContentLoaded={injectedConsoleJS}
            onLoadEnd={() => setPageLoaded(true)}
            onError={(syntheticEvent) => {
              console.warn("WebView error:", syntheticEvent.nativeEvent);
              setHasError(true);
            }}
            onHttpError={(syntheticEvent) => {
              console.warn(
                "HTTP error:",
                syntheticEvent.nativeEvent.statusCode
              );
            }}
            onMessage={handleMessage}
          />
        )}

        {/* Loader + Skeleton */}
        {(!pageLoaded || !minTimePassed) && !hasError && (
          <Animated.View style={[styles.loaderOverlay, { opacity: fadeAnim }]}>
            <Animated.View
              style={[
                styles.skeletonVideo,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.4, 0.8, 0.4],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonText,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.7, 0.3],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonTextSmall,
                {
                  opacity: shimmerAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 0.7, 0.3],
                  }),
                },
              ]}
            />
            <ActivityIndicator size="large" color="#1976D2" />
          </Animated.View>
        )}

        {/* Error Screen */}
        {hasError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>⚠️ Player Load Failed</Text>
            <Text style={styles.errorText}>
              Network issue ya player unavailable hai
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PlayerScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  skeletonVideo: {
    width: "100%",
    height: 220,
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    marginBottom: 20,
  },
  skeletonText: {
    width: "70%",
    height: 16,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    marginBottom: 10,
  },
  skeletonTextSmall: {
    width: "50%",
    height: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 6,
    marginBottom: 30,
  },
  errorBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "700",
    marginBottom: 8,
  },
  errorText: {
    color: "#aaa",
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: "#1976D2",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});