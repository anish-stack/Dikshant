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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import axios from "axios";
import { useSettings } from "../../hooks/useSettings";

const API_BASE = "https://www.app.api.dikshantias.com/api/chat";
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

const PlayerScreen = ({ route, navigation }) => {
  const { settings } = useSettings();
  const { video, batchId, userId, token, courseId, isDemo ,videoId } = route.params || {};
  const playerUrl = `https://www.player.dikshantias.com/?video=${video}&batchId=${batchId}&userId=${userId}&token=${token}&courseId=${courseId}`;
  // console.log(route.params)
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
    if (!video || !userId || hasJoined) return;

    try {
      const payload = { videoId: videoId, userId: String(userId) };
      const { data } = await axios.post(JOIN_API, payload, { timeout: 7000 });
      console.log("✅ Joined chat successfully", data);
      setHasJoined(true);
    } catch (err) {
      console.warn("Join chat failed:", err?.response.data);
    }
  }, [video, userId, hasJoined]);

  const leaveChat = useCallback(async () => {
    if (!hasJoined) return;

    try {
      const payload = { videoId: videoId, userId: String(userId) };
      await axios.post(LEAVE_API, payload, { timeout: 7000 });
      console.log("✅ Left chat successfully");
      setHasJoined(false);
    } catch (err) {
      console.warn("Leave chat failed:", err?.message);
    }
  }, [hasJoined, video, userId]);

  // ─── Confirmation Alert before leaving the screen ───────────────────
  const showLeaveConfirmation = useCallback(() => {
    return new Promise((resolve) => {
      Alert.alert(
        "Class has not ended yet",
        "Do you want to leave the class?",
        [
          {
            text: "No, Stay",
            style: "cancel",
            onPress: () => resolve(false),
          },
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

  // ─── Prevent back navigation without confirmation ───────────────────
  useEffect(() => {
    // React Navigation back/swipe/header back
    const unsubscribe = navigation.addListener("beforeRemove", async (e) => {
      // If not joined → allow normal navigation
      if (!hasJoined) return;

      // Prevent immediate navigation
      e.preventDefault();

      const userWantsToLeave = await showLeaveConfirmation();

      if (userWantsToLeave) {
        await leaveChat();
        // Proceed with the original navigation action
        navigation.dispatch(e.data.action);
      }else{
        navigation.goBack()
      }
      // else → user stays, no navigation happens
    });

    // Android hardware back button
    const backHandler = BackHandler.addEventListener("hardwareBackPress", async () => {
      if (!hasJoined) {
        return false; // default behavior: go back
      }

      const userWantsToLeave = await showLeaveConfirmation();

      if (userWantsToLeave) {
        await leaveChat();
        navigation.goBack();
        return true; // event handled
      }

      return true; // prevent back if user cancels
    });

    return () => {
      unsubscribe();
      backHandler.remove();
    };
  }, [navigation, hasJoined, showLeaveConfirmation, leaveChat]);

  // ─── Auto join on mount / params change ─────────────────────────────
  useEffect(() => {
    if (video && userId) {
      joinChat();
    }

    // Safety cleanup on unmount
    return () => {
      leaveChat();
    };
  }, [video, userId, joinChat, leaveChat]);

  // ─── App state handling (background/foreground) ─────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // Came to foreground → re-join if needed
        if (video && userId && !hasJoined) {
          joinChat();
        }
      } else if (
        nextAppState.match(/inactive|background/) &&
        hasJoined
      ) {
        // Going to background → leave
        leaveChat();
      }

      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [video, userId, hasJoined, joinChat, leaveChat]);

  // ─── Pause video when app backgrounds ───────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        webViewRef.current?.injectJavaScript(`
          const v = document.querySelector("video");
          if (v) { v.pause(); }
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
              const { nativeEvent } = syntheticEvent;
              console.warn("WebView error:", nativeEvent);
              setHasError(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn("HTTP error:", nativeEvent.statusCode);
            }}
            onMessage={(event) => {
              // Handle console messages or other webview messages if needed
            }}
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