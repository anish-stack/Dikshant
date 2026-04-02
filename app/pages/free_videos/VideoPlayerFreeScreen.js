import React, { useState, useRef, useCallback } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Dimensions,
    Platform,
    Animated,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import YoutubePlayer from 'react-native-youtube-iframe'
import { WebView } from 'react-native-webview'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import Layout from '../../components/layout'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const PLAYER_HEIGHT = (SCREEN_WIDTH * 9) / 16

// ─────────────────────────────────────────────────────────────────────────────
// HtmlDescription — renders video.description HTML inside an auto-height WebView
// ─────────────────────────────────────────────────────────────────────────────
const HtmlDescription = ({ html }) => {
    const [webHeight, setWebHeight] = useState(0)

    // Inject JS that measures content height and posts it back to RN
    const injectedJS = `
    (function() {
      function sendHeight() {
        var h = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.ReactNativeWebView.postMessage(String(h));
      }
      window.addEventListener('load', sendHeight);
      setTimeout(sendHeight, 400);
    })();
    true;
  `

    // Wrap the raw HTML in a full page with overrides that match app theme
    const styledHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          color: #333;
          line-height: 1.75;
          background: transparent;
        }
        h1, h2, h3 {
          color: #0f172a;
          font-weight: 700;
          margin-bottom: 8px;
          font-size: 15px;
        }
        p  { font-size: 13px; margin-bottom: 10px; color: #444; }
        ul { padding-left: 20px; margin: 6px 0 10px; }
        li { font-size: 13px; color: #444; margin-bottom: 5px; }
        strong { color: #111; }
        /* Override inline background colors to match red theme */
        [style*="background:#f1f5f9"],
        [style*="background: #f1f5f9"] {
          background: #FEF5F5 !important;
          border-left: 3px solid #C0392B !important;
          border-radius: 8px !important;
          padding: 12px 14px !important;
          margin: 10px 0 !important;
        }
        /* Override green tags to red */
        [style*="background:#16a34a"],
        [style*="background: #16a34a"] {
          background: #C0392B !important;
          color: white !important;
          padding: 4px 12px !important;
          border-radius: 20px !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
        }
        a { color: #C0392B; text-decoration: none; }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `

    return (
        <WebView
            originWhitelist={['*']}
            source={{ html: styledHtml }}
            style={{ width: '100%', height: webHeight || 180, backgroundColor: 'transparent' }}
            scrollEnabled={false}
            injectedJavaScript={injectedJS}
            onMessage={(e) => {
                const h = parseInt(e.nativeEvent.data, 10)
                if (!isNaN(h) && h > 0) setWebHeight(h + 10)
            }}
            showsVerticalScrollIndicator={false}
        />
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function VideoPlayerFreeScreen() {
    const navigation = useNavigation()
    const route = useRoute()
    const { video } = route.params || {}

    // playing = the prop we pass to YoutubePlayer (intent)
    // playerState = what YouTube actually reports back
    const [playing, setPlaying] = useState(false)
    const [ready, setReady] = useState(false)
    const [playerState, setPlayerState] = useState('unstarted')
    const playerRef = useRef(null)

    // Pulse animation for CTA button
    const pulseAnim = useRef(new Animated.Value(1)).current
    const doPulse = () => {
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.94, duration: 90, useNativeDriver: true }),
            Animated.spring(pulseAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start()
    }

    // KEY FIX: sync `playing` state with what YouTube actually reports
    const onStateChange = useCallback((state) => {
        setPlayerState(state)
        if (state === 'playing') setPlaying(true)
        if (state === 'paused') setPlaying(false)
        if (state === 'ended') setPlaying(false)
    }, [])

    // Toggle: flip the `playing` prop which drives YoutubePlayer
    const togglePlay = () => {
        if (!ready) return
        doPulse()
        setPlaying((prev) => !prev)
    }

    const isActuallyPlaying = playerState === 'playing'

    // ── Error state
    if (!video) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={RED} />
                <Text style={styles.errorText}>Video not found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.smallBackBtn}>
                    <Text style={styles.smallBackBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <Layout isHeaderShow={false}>
            <View style={styles.root}>

                {/* ══════════════════════════════
            PLAYER ZONE
        ══════════════════════════════ */}
                <View style={styles.playerZone}>

                    {/* Top bar: back + title + FREE pill */}
                    <View style={styles.topBar}>
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.backCircle}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Ionicons name="arrow-back" size={20} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.topBarTitle} numberOfLines={1}>{video.title}</Text>

                        <View style={styles.freePill}>
                            <View style={styles.freePillDot} />
                            <Text style={styles.freePillText}>FREE</Text>
                        </View>
                    </View>

                    {/* YouTube Player — controls: 0 hides native YouTube controls */}
                    <YoutubePlayer
                        ref={playerRef}
                        height={PLAYER_HEIGHT}
                        width={SCREEN_WIDTH}
                        videoId={video.youtubeVideoId}
                        play={playing}
                        onChangeState={onStateChange}
                        onReady={() => setReady(true)}
                        webViewStyle={{ opacity: 0.99 }} // fixes Android flicker
                        initialPlayerParams={{
                            controls: 0,       // ← HIDE native YouTube controls
                            modestbranding: 1,
                            rel: 0,
                            showinfo: 0,
                            iv_load_policy: 3,
                        }}
                    />

                    {/* Custom controls bar below player */}
                    <View style={styles.controlBar}>
                        <View style={styles.controlLeft}>
                            <View style={styles.lectureChip}>
                                <Text style={styles.lectureChipText}>#{video.position}</Text>
                            </View>
                            <Feather name="clock" size={11} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.controlDuration}>{video.duration}</Text>
                        </View>


                    </View>
                </View>

                {/* ══════════════════════════════
            INFO SECTION
        ══════════════════════════════ */}
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Tags */}
                    <View style={styles.tagRow}>
                        <View style={styles.tagRed}>
                            <MaterialCommunityIcons name="gift-outline" size={10} color="#fff" />
                            <Text style={styles.tagRedText}>FREE</Text>
                        </View>
                        <View style={styles.tagPink}>
                            <Text style={styles.tagPinkText}>DOUBT SESSION</Text>
                        </View>
                        <View style={styles.tagGrey}>
                            <Text style={styles.tagGreyText}>Lecture #{video.position}</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.videoTitle}>{video.title}</Text>

                    {/* Meta chips */}
                    <View style={styles.chipRow}>
                        <View style={styles.chip}>
                            <Feather name="clock" size={12} color={RED} />
                            <Text style={styles.chipText}>{video.duration}</Text>
                        </View>
                        <View style={styles.chip}>
                            <Ionicons name="logo-youtube" size={13} color={RED} />
                            <Text style={styles.chipText}>YouTube</Text>
                        </View>
                        <View style={styles.chip}>
                            <MaterialCommunityIcons name="book-open-outline" size={13} color={RED} />
                            <Text style={styles.chipText}>UPSC Prep</Text>
                        </View>
                    </View>



                    {/* ── Section divider ── */}
                    <View style={styles.sectionDivider}>
                        <View style={styles.divLine} />
                        <Text style={styles.divLabel}>About this Video</Text>
                        <View style={styles.divLine} />
                    </View>

                    {/* ── Description ── */}
                    <View style={styles.descCard}>
                        {video.description ? (
                            <HtmlDescription html={video.description} />
                        ) : (
                            <Text style={styles.descFallback}>
                                This is a free doubt-solving session by Dikshant IAS. Watch, learn,
                                and clear your concepts — no login required.
                            </Text>
                        )}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <MaterialCommunityIcons name="school-outline" size={13} color="#CCC" />
                        <Text style={styles.footerText}>Dikshant IAS · Free Content Series</Text>
                    </View>
                </ScrollView>
            </View>
        </Layout>
    )
}

// ── Constants ──────────────────────────────────────────────────────────────────
const RED = '#C0392B'
const RED_DARK = '#96281B'
const RED_LIGHT = '#FADBD8'
const WHITE = '#FFFFFF'

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: WHITE },

    // Player zone
    playerZone: { backgroundColor: '#0D0D0D' },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: Platform.OS === 'ios' ? 10 : 10,
        paddingBottom: 8,
        gap: 10,
    },
    backCircle: {
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    topBarTitle: { flex: 1, color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '600' },
    freePill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: RED, borderRadius: 20,
        paddingHorizontal: 9, paddingVertical: 3,
    },
    freePillDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
    freePillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

    // Custom control bar
    controlBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 2,
        borderBottomColor: RED,
    },
    controlLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lectureChip: {
        backgroundColor: 'rgba(192,57,43,0.2)',
        borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
        borderWidth: 1, borderColor: 'rgba(192,57,43,0.35)',
    },
    lectureChipText: { color: RED, fontSize: 11, fontWeight: '700' },
    controlDuration: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500' },
    controlPlayBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: RED, borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    controlPlayBtnDisabled: { opacity: 0.4 },
    controlPlayText: { color: '#fff', fontWeight: '700', fontSize: 12 },

    // Scroll
    scroll: { flex: 1, backgroundColor: '#FDFAFA' },
    scrollContent: { padding: 18, paddingBottom: 50 },

    // Tags
    tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
    tagRed: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: RED, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    },
    tagRedText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    tagPink: { backgroundColor: RED_LIGHT, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    tagPinkText: { color: RED, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
    tagGrey: { backgroundColor: '#EFEFEF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    tagGreyText: { color: '#666', fontSize: 10, fontWeight: '600' },

    videoTitle: { fontSize: 19, fontWeight: '800', color: '#111', lineHeight: 26, marginBottom: 12 },

    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: RED_LIGHT, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    },
    chipText: { color: RED_DARK, fontSize: 11, fontWeight: '600' },

    // Big CTA
    bigCta: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: RED, borderRadius: 16,
        paddingVertical: 14, paddingHorizontal: 20,
        gap: 14, marginBottom: 24,
        shadowColor: RED,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    bigCtaDisabled: { opacity: 0.5 },
    bigCtaIconWrap: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center', justifyContent: 'center',
    },
    bigCtaLabel: { color: '#fff', fontWeight: '800', fontSize: 16 },
    bigCtaSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 3 },

    // Divider
    sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    divLine: { flex: 1, height: 1, backgroundColor: '#EEE' },
    divLabel: { color: '#999', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    // Description
    descCard: {
        backgroundColor: WHITE, borderRadius: 14, padding: 14,
        borderWidth: 1, borderColor: '#F0E8E8', marginBottom: 22,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    },
    descFallback: { fontSize: 13, color: '#555', lineHeight: 20 },

    // Footer
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 4 },
    footerText: { color: '#CCC', fontSize: 11, letterSpacing: 0.4 },

    // Error
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: WHITE },
    errorText: { color: '#555', fontSize: 15, marginTop: 12 },
    smallBackBtn: { marginTop: 16, backgroundColor: RED, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 25 },
    smallBackBtnText: { color: WHITE, fontWeight: '700' },
})