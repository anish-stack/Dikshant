import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Layout from '../../components/layout';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Inspirational quotes for learning
const QUOTES = [
  "Education is the most powerful weapon which you can use to change the world.",
  "The beautiful thing about learning is that no one can take it away from you.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your education is a dress rehearsal for a life that is yours to lead.",
];

const RAPID_API_KEY = '75ad2dad64msh17034f06cc47c06p18295bjsn18e367df005b';
const RAPID_API_HOST = 'youtube138.p.rapidapi.com';
const PLAYLIST_ID = 'PLDMCq0UgYLKakUgfbA58eYyb-g81FsRxT';

export default function RecordedCourses() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentQuote] = useState(
    QUOTES[Math.floor(Math.random() * QUOTES.length)]
  );
  const [playlistVideos, setPlaylistVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const triggerHaptic = () => {
    try {
        Linking.openURL('https://youtube.com/@dikshantias?si=CXK_Wuqk4KLNFXnH')
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  // Fetch YouTube playlist videos
  const fetchPlaylistVideos = async () => {
    try {
      setError(null);
      const response = await fetch(
        `https://youtube138.p.rapidapi.com/playlist/videos/?id=${PLAYLIST_ID}&hl=en&gl=US`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': RAPID_API_HOST,
            'x-rapidapi-key': RAPID_API_KEY,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch playlist videos');
      }

      const data = await response.json();
      
      // Transform API response to our format
      const transformedVideos = data.contents?.map((item, index) => {
        const video = item.video;
        return {
          id: video.videoId || `video-${index}`,
          videoId: video.videoId,
          title: video.title || 'Untitled Video',
          description: video.descriptionSnippet || 'No description available',
          duration: formatDuration(video.lengthSeconds),
          views: formatViews(video.stats?.views),
          uploadDate: video.publishedTimeText || 'Recently',
          thumbnail: video.thumbnails?.[0]?.url || getYouTubeThumbnail(video.videoId),
        };
      }) || [];

      setPlaylistVideos(transformedVideos);
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError(err.message);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Format duration from seconds to MM:SS or HH:MM:SS
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format views count
  const formatViews = (views) => {
    if (!views) return '0';
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  useEffect(() => {
    fetchPlaylistVideos();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPlaylistVideos();
  }, []);

  const handleVideoPress = (video) => {
    triggerHaptic();
    setSelectedVideo(video);
    setShowVideoModal(true);
    setPlaying(true);
  };

  const handleCloseVideo = () => {
    triggerHaptic();
    setPlaying(false);
    setShowVideoModal(false);
    setTimeout(() => setSelectedVideo(null), 300);
  };

  const onStateChange = useCallback((state) => {
    if (state === 'ended') {
      setPlaying(false);
    }
  }, []);

  const getYouTubeThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Filter videos based on search
  const filteredVideos = playlistVideos.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate total stats
  const totalVideos = playlistVideos.length;
  const totalHours = Math.floor(totalVideos * 45 / 60); // Approximate
  const totalViews = playlistVideos.reduce((sum, video) => {
    const views = video.views.replace(/[KM]/g, '');
    const multiplier = video.views.includes('M') ? 1000000 : video.views.includes('K') ? 1000 : 1;
    return sum + (parseFloat(views) * multiplier);
  }, 0);

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading playlist videos...</Text>
        </View>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to load videos</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              triggerHaptic();
              setLoading(true);
              fetchPlaylistVideos();
            }}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={20} color="#ffffff" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#EF4444']}
            tintColor="#EF4444"
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.heroIcon}>
              <Feather name="play-circle" size={40} color="#EF4444" />
            </View>
            <Text style={styles.heroTitle}>Recorded Courses</Text>
            <Text style={styles.heroSubtitle}>
              Access your complete video library anytime, anywhere
            </Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalVideos}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalHours}+</Text>
                <Text style={styles.statLabel}>Hours</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatViews(totalViews)}</Text>
                <Text style={styles.statLabel}>Views</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quote Card */}
        <View style={styles.quoteCard}>
          <Feather name="bookmark" size={24} color="#EF4444" />
          <Text style={styles.quoteText}>"{currentQuote}"</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Feather name="search" size={20} color="#666666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search videos..."
              placeholderTextColor="#999999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic();
                  setSearchQuery('');
                }}
              >
                <Feather name="x" size={20} color="#666666" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.resultCount}>
            {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} found
          </Text>
        </View>

        {/* Video Grid */}
        <View style={styles.videoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Course Videos</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={triggerHaptic}
            >
              <Text style={styles.viewAllText}>View Playlist</Text>
              <Feather name="external-link" size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {filteredVideos.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="video-off" size={64} color="#CCCCCC" />
              <Text style={styles.emptyTitle}>No videos found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search terms
              </Text>
            </View>
          ) : (
            <View style={styles.videoGrid}>
              {filteredVideos.map((video, index) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => handleVideoPress(video)}
                  activeOpacity={0.8}
                >
                  {/* Thumbnail */}
                  <View style={styles.thumbnailContainer}>
                    <Image
                      source={{ uri: video.thumbnail }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.playOverlay}>
                      <View style={styles.playButton}>
                        <Feather name="play" size={24} color="#ffffff" />
                      </View>
                    </View>
                    {video.duration && (
                      <View style={styles.durationBadge}>
                        <Feather name="clock" size={10} color="#ffffff" />
                        <Text style={styles.durationText}>{video.duration}</Text>
                      </View>
                    )}
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>{index + 1}</Text>
                    </View>
                  </View>

                  {/* Video Info */}
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                    <Text style={styles.videoDescription} numberOfLines={2}>
                      {video.description}
                    </Text>
                    <View style={styles.videoMeta}>
                      <View style={styles.metaItem}>
                        <Feather name="eye" size={12} color="#666666" />
                        <Text style={styles.metaText}>{video.views}</Text>
                      </View>
                      <View style={styles.metaDot} />
                      <Text style={styles.metaText}>{video.uploadDate}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Bottom CTA */}
        <View style={styles.ctaCard}>
          <Feather name="youtube" size={32} color="#EF4444" />
          <Text style={styles.ctaTitle}>Subscribe to our YouTube Channel</Text>
          <Text style={styles.ctaText}>
            Get notified about new videos and live sessions
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={triggerHaptic}
            activeOpacity={0.8}
          >
            <Feather name="youtube" size={20} color="#ffffff" />
            <Text style={styles.ctaButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={showVideoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedVideo?.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseVideo}
              >
                <Feather name="x" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.playerWrapper}>
              {selectedVideo?.videoId && (
                <YoutubePlayer
                  height={width * 0.5625}
                  width={width}
                  videoId={selectedVideo.videoId}
                  play={playing}
                  onChangeState={onStateChange}
                  webViewStyle={styles.youtubePlayer}
                />
              )}
            </View>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalVideoTitle}>{selectedVideo?.title}</Text>
              <View style={styles.modalMeta}>
                <View style={styles.modalMetaItem}>
                  <Feather name="eye" size={16} color="#CCCCCC" />
                  <Text style={styles.modalMetaText}>{selectedVideo?.views} views</Text>
                </View>
                <View style={styles.modalMetaItem}>
                  <Feather name="clock" size={16} color="#CCCCCC" />
                  <Text style={styles.modalMetaText}>{selectedVideo?.duration}</Text>
                </View>
              </View>
              <Text style={styles.modalDescription}>
                {selectedVideo?.description}
              </Text>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#000000',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333333',
  },

  // Quote Card
  quoteCard: {
    backgroundColor: '#FFF3F3',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    flexDirection: 'row',
    gap: 12,
  },
  quoteText: {
    flex: 1,
    fontSize: 14,
    fontStyle: 'italic',
    color: '#000000',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
  },
  resultCount: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
    marginLeft: 4,
  },

  // Video Section
  videoSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },

  // Video Grid
  videoGrid: {
    gap: 16,
  },
  videoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbnailContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#000000',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  numberBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 6,
    lineHeight: 22,
  },
  videoDescription: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 18,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#666666',
    marginHorizontal: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#666666',
  },

  // CTA Card
  ctaCard: {
    backgroundColor: '#FFF3F3',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  ctaText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F1F1F',
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  playerWrapper: {
    backgroundColor: '#000000',
  },
  youtubePlayer: {
    backgroundColor: '#000000',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 16,
  },
  modalVideoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  modalMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalMetaText: {
    fontSize: 13,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  modalDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 22,
  },
});