import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { fetcher } from '../../constant/fetcher';
import { useAuthStore } from '../../stores/auth.store';
import axios from 'axios';
import { API_URL_LOCAL_ENDPOINT } from '../../constant/api';

export default function ViewAllVideos({ route, navigation }) {
  const { id: batchId, subjectId } = route.params || {};
  const { token, user } = useAuthStore();

  const { data: videosData, isLoading, error } = useSWR(
    batchId ? `/videocourses/batch/${batchId}` : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [pdfCounts, setPdfCounts] = useState({});

  const allVideos = videosData?.success ? videosData.data : [];

  // ─── Subject Filter ──────────────────────────────────────────────
  const displayedVideos = useMemo(() => {
    if (!subjectId) return allVideos;
    return allVideos.filter((video) => video.subjectId === subjectId);
  }, [allVideos, subjectId]);

  // ─── PDF Counts ──────────────────────────────────────────────────
  useEffect(() => {
    if (displayedVideos.length === 0) return;

    const fetchPdfCounts = async () => {
      try {
        const uniqueVideoIds = [...new Set(displayedVideos.map((v) => v.id))];
        const counts = {};

        await Promise.all(
          uniqueVideoIds.map(async (videoId) => {
            try {
              const res = await axios.get(
                `${API_URL_LOCAL_ENDPOINT}/pdfnotes?videoId=${videoId}`
              );
              counts[videoId] = res.data?.count || 0;
            } catch {
              counts[videoId] = 0;
            }
          })
        );

        setPdfCounts(counts);
      } catch (err) {
        console.log('PDF counts fetch failed:', err);
      }
    };

    fetchPdfCounts();
  }, [displayedVideos]);

  // ─── Video Status Logic ──────────────────────────────────────────
  const getVideoStatus = (video) => {
    const now = new Date();

    let classDateTime = null;
    if (video.dateOfClass && video.TimeOfClass) {
      const [year, month, day] = video.dateOfClass.split('-').map(Number);
      const [hours, minutes, seconds = 0] = video.TimeOfClass.split(':').map(Number);
      classDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
    }

    if (video.isLive && !video.isLiveEnded) {
      return {
        status: 'live',
        label: 'Live Now',
        color: '#dc2626',
        bgColor: '#fef2f2',
        icon: 'radio-button-on',
      };
    }

    if (classDateTime && now >= classDateTime) {
      return {
        status: 'completed',
        label: 'Available',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        icon: 'checkmark-circle',
      };
    }

    if (classDateTime && now < classDateTime) {
      return {
        status: 'upcoming',
        label: 'Upcoming',
        color: '#d97706',
        bgColor: '#fffbeb',
        icon: 'time',
      };
    }

    return {
      status: 'completed',
      label: 'Available',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      icon: 'checkmark-circle',
    };
  };

  // ─── Filtered & Sorted Videos ────────────────────────────────────
  const filteredVideos = useMemo(() => {
    let list = [...displayedVideos];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => v.title?.toLowerCase().includes(q));
    }

    // Status filter
    if (filterType !== 'all') {
      list = list.filter((v) => getVideoStatus(v).status === filterType);
    }

    // Sort priority: live > upcoming > completed
    list.sort((a, b) => {
      const order = { live: 0, upcoming: 1, completed: 2 };
      return order[getVideoStatus(a).status] - order[getVideoStatus(b).status];
    });

    return list;
  }, [displayedVideos, searchQuery, filterType]);

  // ─── Open Video Handler ──────────────────────────────────────────
  const openVideo = async (video) => {
    if (!video || !user?.id || !token || !batchId || !video.secureToken) {
      Alert.alert('Error', 'Missing required data to play video.');
      return;
    }

    const status = getVideoStatus(video);

    if (status.status === 'upcoming') {
      Alert.alert('Not Available Yet', 'This class has not started.');
      return;
    }

    navigation.navigate('PlayerScreen', {
      video: video.secureToken,
      batchId: video?.batchId ?? batchId,
      userId: String(user.id),
      token,
      courseId: String(batchId),
    });
  };

  // ─── Loading / Error States ──────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading classes...</Text>
      </SafeAreaView>
    );
  }

  if (error || !videosData?.success) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#dc2626" />
        <Text style={styles.errorTitle}>Failed to load videos</Text>
        <Text style={styles.errorSubtitle}>Please check your connection</Text>
      </SafeAreaView>
    );
  }

  const isSubjectMode = !!subjectId;
  const pageTitle = isSubjectMode ? 'Subject Videos' : 'All Videos';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pageTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            placeholder="Search classes, topics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        {[
          { key: 'all', label: 'All' },
          { key: 'live', label: 'Live' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'completed', label: 'Available' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilterType(f.key)}
            style={[styles.filterTab, filterType === f.key && styles.filterTabActive]}
          >
            <Text
              style={[styles.filterText, filterType === f.key && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Video List */}
      <FlatList
        data={filteredVideos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="video-off-outline" size={72} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No videos found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? 'Try a different search'
                : isSubjectMode
                  ? 'No videos available for this subject yet'
                  : 'New classes will appear here soon'}
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const status = getVideoStatus(item);
          const pdfCount = pdfCounts[item.id] || 0;
          const isLive = status.status === 'live';
          const isUpcoming = status.status === 'upcoming';

          return (
            <TouchableOpacity
              onPress={() => openVideo(item)}
              style={[
                styles.videoCard,
                isLive && styles.liveCard,
                isUpcoming && styles.upcomingCard,
              ]}
              activeOpacity={0.78}
              disabled={isUpcoming}
            >
              {isLive && (
                <View style={styles.liveTopBar}>
                  <View style={styles.livePulse} />
                  <Text style={styles.liveTopText}>LIVE NOW</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                {/* Thumbnail */}
                <View style={styles.thumbnailContainer}>
                  {item?.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
                  ) : (
                    <View style={[styles.thumbnail, styles.placeholderThumb]}>
                      <MaterialCommunityIcons name="play-circle-outline" size={40} color="#fff" />
                    </View>
                  )}

                  {item.duration && (
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>{item.duration}</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.infoSection}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
                    <Ionicons name={status.icon} size={14} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>

                  {/* {item?.dateOfClass && (
                    <View style={styles.dateTimeRow}>
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text style={styles.dateText}>
                        {new Date(item.dateOfClass).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>

                      {item?.TimeOfClass && !isLive && (
                        <>
                          <Text style={styles.dateDivider}> • </Text>
                          <Ionicons name="time-outline" size={14} color="#6b7280" />
                          <Text style={styles.dateText}>{item.TimeOfClass.substring(0, 5)}</Text>
                        </>
                      )}
                    </View>
                  )} */}
                </View>

                {/* Actions */}
                <View style={styles.actionsColumn}>
                  {pdfCount > 0 && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('PdfNotes', {
                          videoId: item.id,
                          videoTitle: item.title,
                          batchId,
                        });
                      }}
                      style={styles.pdfButton}
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={24} color="#dc2626" />
                      {pdfCount > 1 && (
                        <View style={styles.pdfCountBadge}>
                          <Text style={styles.pdfCountText}>{pdfCount}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}

                  {!isUpcoming && (
                    <Ionicons name="chevron-forward" size={24} color="#9ca3af" style={styles.chevron} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  searchSection: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
  },
  // Search Section
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },

  // Filter Section
  filterSection: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },

  // Video List
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },

  // Video Card
  videoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  liveCard: {
    borderColor: '#dc2626',
    borderWidth: 2,
    shadowColor: '#dc2626',
    shadowOpacity: 0.15,
  },
  upcomingCard: {
    opacity: 0.7,
  },
  liveTopBar: {
    backgroundColor: '#dc2626',
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    // Animation would be added with Animated API in production
  },
  liveTopText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },

  // Thumbnail
  thumbnailContainer: {
    position: 'relative',
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
  },
  placeholderThumb: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Info Section
  infoSection: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 21,
    // marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  dateDivider: {
    fontSize: 12,
    color: '#d1d5db',
    marginHorizontal: 2,
  },

  // Actions Column
  actionsColumn: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pdfButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  pdfCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pdfCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  chevron: {
    marginTop: 8,
  },
});