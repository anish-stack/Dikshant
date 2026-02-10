import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useSettings } from "../../hooks/useSettings";

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

  console.log = function () {
    send('log', arguments);
  };

  console.warn = function () {
    send('warn', arguments);
  };

  console.error = function () {
    send('error', arguments);
  };
})();
true;
`;

const PlayerScreen = ({ route }) => {
  const { settings } = useSettings();
  const { video, batchId, userId, token, courseId, isDemo} = route.params || {};

  const playerUrl = `${"https://www.player.dikshantias.com/"}?video=${video}&batchId=${batchId}&userId=${userId}&token=${token}&courseId=${courseId}`;
  console.log("",playerUrl)
  const [pageLoaded, setPageLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const webViewRef = useRef(null);

  /* ⏱ Minimum loader time */
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_LOADING_TIME);
    return () => clearTimeout(timer);
  }, []);

  /* ✨ Shimmer animation */
  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  /* 👁 Hide loader only when BOTH ready */
  useEffect(() => {
    if (pageLoaded && minTimePassed) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [pageLoaded, minTimePassed]);

  /* ⏸ Pause video on app background */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        webViewRef.current?.injectJavaScript(`
          const v = document.querySelector("video");
          if(v){ v.pause(); }
          true;
        `);
      }
    });
    return () => sub.remove();
  }, []);

  /* 🔁 Retry handler */
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
        {/* 🔥 WEBVIEW */}
        {!hasError && (
          <WebView
            ref={webViewRef}
            source={{ uri: playerUrl }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsFullscreenVideo={true}
            allowsInlineMediaPlayback={true}                    // Crucial for iOS
            mediaPlaybackRequiresUserAction={false}             // Allows autoplay/unmute on iOS
            androidLayerType="hardware"                         // Fixes black screen on Android
            mixedContentMode="compatibility"                    // Helps with HTTP on Android
            thirdPartyCookiesEnabled={true}
            injectedJavaScriptBeforeContentLoaded={injectedConsoleJS}
            onLoadEnd={() => setPageLoaded(true)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
              setHasError(true);
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('HTTP error: ', nativeEvent.statusCode);
            }}
            onMessage={(event) => { /* your existing handler */ }}
          />

        )}

        {/* 🔥 LOADER + SKELETON */}
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

        {/* ❌ ERROR UI */}
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
