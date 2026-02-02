import React, { useEffect, useState, useCallback } from "react";
import { View, Image, Pressable } from "react-native";
import { Linking } from "react-native";
import LiveVideoPlayer from "./LiveVideoPlayer";
import { useAuthStore } from "../stores/auth.store";

export default function SmartVideoPlayer({
  video,
  userId,
  courseId,
  onShowComments,
  onShowDoubts,
  onShowMyDoubts,
  onLiveEnded,
}) {
  const { token } = useAuthStore();
  const [hasLiveEnded, setHasLiveEnded] = useState(false);

  /* ---------------- LIVE STATUS CHECK ---------------- */
  useEffect(() => {
    if (!video || !video.isLive) {
      setHasLiveEnded(false);
      return;
    }

    if (video.isLiveEnded === true) {
      setHasLiveEnded(true);
      return;
    }

    if (video.DateOfLive && video.TimeOfLIve) {
      const checkIfEnded = () => {
        const start = new Date(`${video.DateOfLive} ${video.TimeOfLIve}`);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2h
        setHasLiveEnded(new Date() > end);
      };

      checkIfEnded();
      const interval = setInterval(checkIfEnded, 60000);
      return () => clearInterval(interval);
    }
  }, [video]);

  /* ---------------- OPEN WEB PLAYER ---------------- */
  const openWebPlayer = useCallback(async () => {
    if (!video?.url) return;

    const params = new URLSearchParams({
      video: video.url,
      batchId: video?.bacthId ?? "",
      userId: String(userId),
      courseId: String(courseId),
      token, // ⚠️ consider short-lived token in prod
    }).toString();

    const url = `https://www.player.dikshantias.com/?${params}`;
    await Linking.openURL(url);
  }, [video, userId, courseId, token]);

  /* ---------------- RECORDED VIDEO ---------------- */
  if (!video?.isLive || hasLiveEnded || video?.isLiveEnded) {
    return (
      <Pressable onPress={openWebPlayer}>
        <View style={{ aspectRatio: 16 / 9, backgroundColor: "#000" }}>
          <Image
            source={{ uri: video.thumbnail }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />

          {/* Play Overlay */}
          <View
            style={{
              position: "absolute",
              inset: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                padding: 18,
                borderRadius: 50,
              }}
            >
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderLeftWidth: 18,
                  borderTopWidth: 12,
                  borderBottomWidth: 12,
                  borderLeftColor: "white",
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                }}
              />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  /* ---------------- LIVE VIDEO ---------------- */
  return (
    <LiveVideoPlayer
      video={video}
      userId={userId}
      onShowComments={onShowComments}
      onShowDoubts={onShowDoubts}
      onShowMyDoubts={onShowMyDoubts}
      onLiveEnded={onLiveEnded}
    />
  );
}
