import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import axios from 'axios'
import { API_URL_LOCAL_ENDPOINT } from '../../constant/api'
import Layout from '../../components/layout'
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'

axios.defaults.baseURL = API_URL_LOCAL_ENDPOINT

// ── Thumbnail helper ───────────────────────────────────────────────────────────
const getYoutubeThumbnail = (videoId) =>
  `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`

// ── Single Video Row ───────────────────────────────────────────────────────────
const VideoRow = ({ video, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={() => onPress(video)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.videoRow}
      >
        {/* Thumbnail */}
        <View style={styles.thumbContainer}>
          <Image
            source={{ uri: getYoutubeThumbnail(video.youtubeVideoId) }}
            style={styles.thumb}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <Ionicons name="play" size={14} color="#fff" />
          </View>
        </View>

        {/* Info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {video.title}
          </Text>
          <View style={styles.videoMeta}>
            <Feather name="clock" size={11} color="#C0392B" />
            <Text style={styles.videoDuration}>{video.duration}</Text>
          </View>
        </View>

        {/* Index badge */}
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

// ── Accordion Playlist Card ────────────────────────────────────────────────────
const PlaylistCard = ({ playlist, onVideoPress }) => {
  const [open, setOpen] = useState(false)
  const heightAnim = useRef(new Animated.Value(0)).current
  const rotateAnim = useRef(new Animated.Value(0)).current

  const toggle = () => {
    const toValue = open ? 0 : 1
    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
    setOpen(!open)
  }

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  })

  // Estimate height: each video row ~80px
  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, playlist.videos.length * 90],
  })

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity onPress={toggle} style={styles.cardHeader} activeOpacity={0.85}>
        {/* Left accent bar */}
        <View style={styles.accentBar} />

        <View style={styles.cardHeaderContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{playlist.title}</Text>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons name="chevron-down" size={20} color="#C0392B" />
            </Animated.View>
          </View>
          <Text style={styles.cardDesc} numberOfLines={1}>
            {playlist.description}
          </Text>
          <View style={styles.cardFooterRow}>
            <MaterialIcons name="video-library" size={13} color="#C0392B" />
            <Text style={styles.cardCount}>
              {playlist.videos.length} Video{playlist.videos.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Collapsible Videos */}
      <Animated.View style={[styles.videoList, { maxHeight }]}>
        {playlist.videos.map((video, i) => (
          <VideoRow
            key={video.id}
            video={video}
            index={i}
            onPress={onVideoPress}
          />
        ))}
      </Animated.View>
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function AllPlayList() {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigation = useNavigation()

  const fetchPlaylists = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data } = await axios.get('/free/playlist')
      setPlaylists(data)
    } catch (err) {
      setError('Could not load playlists. Please try again.')
      console.error('[AllPlayList] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const handleVideoPress = (video) => {
    navigation.navigate('VideoPlayerFreeScreen', { video })
  }

  return (
    <Layout isHeaderShow={false}>

      {/* ── Hero Header ── */}
      <View style={styles.hero}>
        {/* Decorative circles */}
        <View style={styles.heroCircle1} />
        <View style={styles.heroCircle2} />

        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>DIKSHANT IAS</Text>
          <Text style={styles.heroTitle}>Free Playlists</Text>
          <Text style={styles.heroSub}>
            Curated doubt-solving sessions for your UPSC prep
          </Text>
        </View>
      </View>

      {/* ── Body ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#C0392B" />
          <Text style={styles.loadingText}>Loading playlists…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color="#C0392B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPlaylists}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PlaylistCard playlist={item} onVideoPress={handleVideoPress} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No playlists available yet.</Text>
            </View>
          }
        />
      )}
    </Layout>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const RED = '#C0392B'
const RED_DARK = '#96281B'
const RED_LIGHT = '#FADBD8'
const WHITE = '#FFFFFF'
const GREY_BG = '#FDF5F5'
const GREY_TEXT = '#888'

const styles = StyleSheet.create({
  // Hero
  hero: {
    backgroundColor: RED,
    paddingTop: 48,
    paddingBottom: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -40,
    right: -40,
  },
  heroCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -20,
    left: 20,
  },
  heroContent: { position: 'relative', zIndex: 1 },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 4,
  },
  heroTitle: {
    color: WHITE,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },

  // List
  list: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: GREY_BG,
  },

  // Card
  card: {
    backgroundColor: WHITE,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: RED,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  accentBar: {
    width: 4,
    backgroundColor: RED,
    borderTopLeftRadius: 14,
  },
  cardHeaderContent: {
    flex: 1,
    padding: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginRight: 8,
    lineHeight: 22,
  },
  cardDesc: {
    fontSize: 12,
    color: GREY_TEXT,
    marginTop: 4,
    lineHeight: 17,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  cardCount: {
    fontSize: 12,
    color: RED,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Video list (animated)
  videoList: {
    overflow: 'hidden',
    backgroundColor: '#FEF9F9',
  },

  // Video row
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: RED_LIGHT,
  },
  thumbContainer: {
    width: 90,
    height: 54,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#eee',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: RED,
    borderRadius: 10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 18,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 4,
  },
  videoDuration: {
    fontSize: 11,
    color: RED,
    fontWeight: '500',
    marginLeft: 3,
  },
  indexBadge: {
    marginLeft: 10,
    backgroundColor: RED_LIGHT,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  indexText: {
    fontSize: 11,
    fontWeight: '700',
    color: RED_DARK,
  },

  // States
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    backgroundColor: GREY_BG,
  },
  loadingText: {
    marginTop: 12,
    color: GREY_TEXT,
    fontSize: 14,
  },
  errorText: {
    color: '#555',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 30,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: RED,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 25,
  },
  retryText: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    color: GREY_TEXT,
    fontSize: 14,
  },
})