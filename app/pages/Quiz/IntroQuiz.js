import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  View,
  Text,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { CommonActions } from "@react-navigation/native";

const VIDEO_SOURCE = require("./Untitled design.mp4");

export default function IntroQuiz({ navigation }) {
  const timeoutRef = useRef(null);
  const navigatedRef = useRef(false);

  const player = useVideoPlayer(VIDEO_SOURCE, (player) => {
    player.loop = false;
    player.play();
  });

  /* 🔁 Navigation reset */
  const goToAllQuizes = () => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: "Home" },
          { name: "AllQuizes" },
        ],
      })
    );
  };

  /* ⏱️ Auto navigate: video end OR 2 sec */
  useEffect(() => {
    timeoutRef.current = setTimeout(goToAllQuizes, 2000);

    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        goToAllQuizes();
      }
    });

    return () => {
      sub.remove();
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <StatusBar hidden />

      <TouchableOpacity
        activeOpacity={1}
        onPress={goToAllQuizes}
        style={styles.container}
      >
        <VideoView
          player={player}
          nativeControls={false}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />

      
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

});
