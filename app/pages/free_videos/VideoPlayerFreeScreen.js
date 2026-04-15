import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Layout from '../../components/layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLAYER_HEIGHT = (SCREEN_WIDTH * 9) / 16;

export default function VideoPlayerFreeScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { video } = route.params || {};

    const [playing, setPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const playerRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const progressInterval = useRef(null);

    const safeVideo = video || {};
    const videoId = safeVideo.youtubeVideoId || safeVideo.videoId;

    // Pulse animation
    const doPulse = useCallback(() => {
        Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
            Animated.spring(pulseAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
        ]).start();
    }, []);

    // State Change
    const onStateChange = useCallback((state) => {
        console.log('Player State:', state);

        if (state === 'playing') {
            setPlaying(true);
            setIsBuffering(false);
        } else if (state === 'paused' || state === 'ended') {
            setPlaying(false);
        } else if (state === 'buffering') {
            setIsBuffering(true);
        }
    }, []);

    const onReady = useCallback(() => {
        console.log('✅ Player Ready');
        setReady(true);
        setIsBuffering(false);

        // Get total duration once ready
        setTimeout(async () => {
            if (playerRef.current) {
                try {
                    const dur = await playerRef.current.getDuration();
                    setDuration(dur);
                } catch (e) { }
            }
        }, 800);
    }, []);

    // Toggle Play/Pause
    const togglePlayPause = useCallback(() => {
        if (!ready) return;
        doPulse();
        setPlaying((prev) => !prev);
    }, [ready, doPulse]);

    // Seek Forward 10s
    const seekForward = useCallback(async () => {
        if (!ready || !playerRef.current) return;
        try {
            const time = await playerRef.current.getCurrentTime();
            await playerRef.current.seekTo(Math.floor(time) + 10);
        } catch (e) {
            console.log('Seek forward error');
        }
    }, [ready]);

    // Seek Backward 10s
    const seekBackward = useCallback(async () => {
        if (!ready || !playerRef.current) return;
        try {
            const time = await playerRef.current.getCurrentTime();
            await playerRef.current.seekTo(Math.max(0, Math.floor(time) - 10));
        } catch (e) {
            console.log('Seek backward error');
        }
    }, [ready]);

    // Update progress every second when playing
    useEffect(() => {
        if (playing && ready) {
            progressInterval.current = setInterval(async () => {
                if (playerRef.current) {
                    try {
                        const time = await playerRef.current.getCurrentTime();
                        setCurrentTime(time);
                    } catch (e) { }
                }
            }, 1000);
        } else {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        }

        return () => {
            if (progressInterval.current) clearInterval(progressInterval.current);
        };
    }, [playing, ready]);

    // Format seconds to MM:SS
    const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!videoId) {
        return (
            <Layout isHeaderShow={false}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={64} color="#C0392B" />
                    <Text style={styles.errorText}>Video not available</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        );
    }


    return (
        <Layout isHeaderShow={false}>
            <View style={styles.root}>
                {/* Player Zone */}
                <View style={styles.playerZone}>
                    <View style={styles.topBar}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
                            <Ionicons name="arrow-back" size={22} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.topBarTitle} numberOfLines={1}>
                            {safeVideo.title || 'Lecture Video'}
                        </Text>
                        <View style={styles.freePill}>
                            <View style={styles.freePillDot} />
                            <Text style={styles.freePillText}>FREE</Text>
                        </View>
                    </View>

                    {/* YouTube Player - Untouchable */}
                    <View style={styles.playerContainer} >
                        <YoutubePlayer
                            ref={playerRef}
                            height={PLAYER_HEIGHT}
                            width={SCREEN_WIDTH}
                            videoId={videoId}
                            play={playing}
                            onChangeState={onStateChange}
                            onReady={onReady}
                            webViewStyle={{ opacity: 0.99 }}
                            initialPlayerParams={{
                                controls: 0,           // Hide native controls
                                modestbranding: 1,
                                rel: 0,
                                showinfo: 0,
                                iv_load_policy: 3,
                                fs: 0,
                            }}
                        />
                        <View style={styles.overlay} pointerEvents="auto" />
                        {/* Buffering Indicator */}
                        {isBuffering && (
                            <View style={styles.bufferingOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}
                    </View>

                    {/* Custom Controls Below Player */}
                    <View style={styles.customControls}>
                        {/* Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFilled, { width: `${progressPercentage}%` }]} />
                            </View>
                            <View style={styles.timeRow}>
                                <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                                <Text style={styles.timeText}>{formatTime(duration)}</Text>
                            </View>
                        </View>

                        {/* Control Buttons */}
                        <View style={styles.buttonsRow}>
                            <TouchableOpacity style={styles.controlBtn} onPress={seekBackward}>
                                <Ionicons name="play-back" size={28} color="#fff" />
                            </TouchableOpacity>


                            <TouchableOpacity style={styles.controlBtn} onPress={seekForward}>
                                <Ionicons name="play-forward" size={28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Scrollable Content */}
                <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.tagRow}>
                        <View style={styles.tagRed}>
                            <MaterialCommunityIcons name="gift-outline" size={12} color="#fff" />
                            <Text style={styles.tagRedText}>FREE</Text>
                        </View>
                        <View style={styles.tagPink}><Text style={styles.tagPinkText}>DOUBT SESSION</Text></View>
                        <View style={styles.tagGrey}><Text style={styles.tagGreyText}>Lecture #{safeVideo.position || 1}</Text></View>
                    </View>

                    <Text style={styles.videoTitle}>{safeVideo.title || 'Untitled Lecture'}</Text>

                    <View style={styles.chipRow}>
                        <View style={styles.chip}>
                            <Feather name="clock" size={13} color="#C0392B" />
                            <Text style={styles.chipText}>{safeVideo.duration || '--:--'}</Text>
                        </View>
                        <View style={styles.chip}>
                            <Ionicons name="logo-youtube" size={14} color="#C0392B" />
                            <Text style={styles.chipText}>YouTube</Text>
                        </View>
                    </View>

                    <View style={styles.sectionDivider}>
                        <View style={styles.divLine} />
                        <Text style={styles.divLabel}>ABOUT THIS VIDEO</Text>
                        <View style={styles.divLine} />
                    </View>

                    <View style={styles.descCard}>
                        {safeVideo.description ? (
                            <Text style={styles.descriptionText}>{safeVideo.description}</Text>
                        ) : (
                            <Text style={styles.descFallback}>
                                This is a free doubt-solving session by Dikshant IAS.
                            </Text>
                        )}
                    </View>

                    <View style={styles.footer}>
                        <MaterialCommunityIcons name="school-outline" size={14} color="#999" />
                        <Text style={styles.footerText}>Dikshant IAS • Free Content Series</Text>
                    </View>
                </ScrollView>
            </View>
        </Layout>
    );
}

// ===================== STYLES =====================
const RED = '#C0392B';

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFFFFF' },
    playerZone: { backgroundColor: '#0D0D0D' },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    backCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topBarTitle: { flex: 1, color: '#fff', fontSize: 14.5, fontWeight: '600' },
    freePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: RED,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    freePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
    freePillText: { color: '#fff', fontSize: 9.5, fontWeight: '800' },

    playerContainer: {
        position: 'relative',
        backgroundColor: '#000',
    },
    bufferingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        height: 70, // Adjust height to cover the share icon
        backgroundColor: '#ffffff00',
    },
    // Custom Controls Below Player
    customControls: {
        backgroundColor: '#1A1A1A',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    progressContainer: {
        marginBottom: 12,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFilled: {
        height: '100%',
        backgroundColor: RED,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 6,
    },
    timeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },

    buttonsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 40,
    },
    controlBtn: {
        padding: 8,
    },
    playPauseBtn: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: RED,
        justifyContent: 'center',
        alignItems: 'center',
    },

    scroll: { flex: 1, backgroundColor: '#FDFAFA' },
    scrollContent: { padding: 18, paddingBottom: 80 },

    tagRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    tagRed: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: RED, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    tagRedText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
    tagPink: { backgroundColor: '#FADBD8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    tagPinkText: { color: RED, fontSize: 10.5, fontWeight: '700' },
    tagGrey: { backgroundColor: '#F0F0F0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
    tagGreyText: { color: '#555', fontSize: 10.5, fontWeight: '600' },

    videoTitle: { fontSize: 20, fontWeight: '800', color: '#111', lineHeight: 28, marginBottom: 14 },
    chipRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FADBD8', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    chipText: { color: '#96281B', fontSize: 12, fontWeight: '600' },

    sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    divLine: { flex: 1, height: 1, backgroundColor: '#EDEDED' },
    divLabel: { color: '#999', fontSize: 11, fontWeight: '700' },

    descCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F5EDED',
        marginBottom: 30,
    },
    descriptionText: { fontSize: 14, color: '#333', lineHeight: 22 },
    descFallback: { fontSize: 14, color: '#555', lineHeight: 22 },

    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    footerText: { color: '#999', fontSize: 12 },

    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 40 },
    errorText: { color: '#555', fontSize: 17, marginTop: 16, textAlign: 'center' },
    backButton: { marginTop: 24, backgroundColor: RED, paddingHorizontal: 32, paddingVertical: 13, borderRadius: 25 },
    backButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});