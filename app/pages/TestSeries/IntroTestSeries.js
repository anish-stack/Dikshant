import React, { useEffect, useRef, useState } from "react"
import {
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  View,
  ActivityIndicator
} from "react-native"
import { useVideoPlayer, VideoView } from "expo-video"
import { CommonActions } from "@react-navigation/native"
import axios from "axios"
import { LOCAL_ENDPOINT } from "../../constant/api"

const API_URL = `${LOCAL_ENDPOINT}/assets`

export default function IntroTestSeries({ navigation }) {
  const [videoUri, setVideoUri] = useState(null)
  const [isFetching, setIsFetching] = useState(true)

  const timeoutRef = useRef(null)
  const navigatedRef = useRef(false)

  const goToAllTestSeries = () => {
    if (navigatedRef.current) return
    navigatedRef.current = true

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "TestSeries" }]
      })
    )
  }

  // ────────────────────────────────────────────────
  //  Fetch video + auto-skip on failure / timeout
  // ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    const fetchVideo = async () => {
      try {
        const response = await axios.get(API_URL, { timeout: 8000 }) // prevent hanging forever
        const data = response.data?.data

        if (isMounted) {
          if (data?.testSeriesVideoIntro) {
            setVideoUri(data.testSeriesVideoIntro)
          } else {
            // No video URL in response → skip immediately
            goToAllTestSeries()
          }
        }
      } catch (err) {
        console.log("Test series intro video fetch failed:", err)
        // Network error / timeout / server down → skip
        if (isMounted) {
          goToAllTestSeries()
        }
      } finally {
        if (isMounted) {
          setIsFetching(false)
        }
      }
    }

    fetchVideo()

    // Safety net: if fetch takes > 5 seconds → skip anyway
    timeoutRef.current = setTimeout(() => {
      if (isMounted && isFetching) {
        goToAllTestSeries()
      }
    }, 5000)

    return () => {
      isMounted = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // ────────────────────────────────────────────────
  //  Video player (only created when videoUri exists)
  // ────────────────────────────────────────────────
  const player = useVideoPlayer(videoUri ? { uri: videoUri } : null, player => {
    if (player) {
      player.loop = false
      player.play()
    }
  })

  useEffect(() => {
    if (!videoUri || !player) return

    const sub = player.addListener("playbackStatusUpdate", status => {
      if (status.didJustFinish) {
        goToAllTestSeries()
      }
    })

    // Extra safety: if video runs longer than 12 seconds → force skip
    const longPlayTimeout = setTimeout(goToAllTestSeries, 12000)

    return () => {
      sub.remove()
      clearTimeout(longPlayTimeout)
    }
  }, [player, videoUri])

  // ────────────────────────────────────────────────
  //  Render
  // ────────────────────────────────────────────────
  if (isFetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  // If we reached here without videoUri → navigation already triggered
  if (!videoUri) {
    return null // nothing to show — already skipping
  }

  return (
    <>
      <StatusBar hidden />

      <TouchableOpacity
        activeOpacity={1}
        onPress={goToAllTestSeries}
        style={styles.container}
      >
        <VideoView
          player={player}
          nativeControls={false}
          style={StyleSheet.absoluteFill}
          // Highly recommended to avoid black screen during buffering:
          // posterSource={{ uri: "https://dikshantiasnew-web.s3.amazonaws.com/app/app-assets/onboarding/a893277e-9c2f-41cd-afeb-725455eab280-g.png" }}
          // posterResizeMode="cover"
          contentFit="cover"
        />
      </TouchableOpacity>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center"
  }
})
