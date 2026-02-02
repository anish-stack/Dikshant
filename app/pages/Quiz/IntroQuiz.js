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

export default function IntroQuiz({ navigation }) {
  const [videoUri, setVideoUri] = useState(null)
  const [isFetching, setIsFetching] = useState(true)

  const timeoutRef = useRef(null)
  const navigatedRef = useRef(false)

  const goToAllQuizes = () => {
    if (navigatedRef.current) return
    navigatedRef.current = true

    navigation.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [{ name: "Home" }, { name: "AllQuizes" }]
      })
    )
  }

  // ────────────────────────────────────────────────
  //  Fetch video aur handle fail → auto skip
  // ────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    const fetchVideo = async () => {
      try {
        const response = await axios.get(API_URL, { timeout: 8000 }) // 8 sec timeout
        const data = response.data?.data

        if (isMounted) {
          if (data?.quizVideoIntro) {
            setVideoUri(data.quizVideoIntro)
          } else {
            // No video URL → skip immediately
            goToAllQuizes()
          }
        }
      } catch (err) {
        console.log("Intro video fetch failed:", err)
        // API fail ya network issue → skip
        if (isMounted) {
          goToAllQuizes()
        }
      } finally {
        if (isMounted) {
          setIsFetching(false)
        }
      }
    }

    fetchVideo()

    // Safety: agar 5 second mein kuch na ho toh bhi skip
    timeoutRef.current = setTimeout(() => {
      if (isMounted && isFetching) {
        goToAllQuizes()
      }
    }, 5000)

    return () => {
      isMounted = false
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  // ────────────────────────────────────────────────
  //  Video player setup (sirf tab jab videoUri mile)
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
        goToAllQuizes()
      }
    })

    // Fallback: agar video 12 sec se zyada chalta hai to bhi skip
    const longTimeout = setTimeout(goToAllQuizes, 12000)

    return () => {
      sub.remove()
      clearTimeout(longTimeout)
    }
  }, [player, videoUri])

  // ────────────────────────────────────────────────
  //  UI — sirf video chal raha ho tab dikhana, warna kuch mat dikhao (skip ho chuka hoga)
  // ────────────────────────────────────────────────
  if (isFetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  // Agar yahan tak pahunch gaye aur videoUri nahi hai → already skip ho chuka hoga
  // lekin safety ke liye
  if (!videoUri) {
    return null // ya <View /> — kuch bhi mat render karo
  }

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
          // posterSource={{ uri: "https://your-poster-url.jpg" }}  // ← optional, black screen avoid karne ke liye
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
