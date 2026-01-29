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
import React, { useState, useMemo, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { fetcher } from '../../constant/fetcher';
import { useAuthStore } from '../../stores/auth.store';
import axios from 'axios';
import { API_URL_LOCAL_ENDPOINT } from '../../constant/api';

export default function ViewAllVideos({ route, navigation }) {
    const { id } = route.params || {};
    const { token, user } = useAuthStore();
    
    const { data: videosData, isLoading, error } = useSWR(
        id ? `/videocourses/batch/${id}` : null,
        fetcher,
        { revalidateOnFocus: true }
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [pdfCounts, setPdfCounts] = useState({});

    const videos = videosData?.success ? videosData.data : [];

    // Fetch PDF counts for all videos
    const fetchPdfCounts = async () => {
        try {
            const uniqueVideoIds = [...new Set(videos.map(v => v.id))];
            const counts = {};

            await Promise.all(
                uniqueVideoIds.map(async (videoId) => {
                    try {
                        const res = await axios.get(
                            `${API_URL_LOCAL_ENDPOINT}/pdfnotes?videoId=${videoId}`
                        );
                        counts[videoId] = res.data?.count || 0;
                    } catch (err) {
                        counts[videoId] = 0;
                    }
                })
            );

            setPdfCounts(counts);
        } catch (error) {
            console.log('Error fetching PDF counts:', error);
        }
    };

    useEffect(() => {
        if (videos.length > 0) {
            fetchPdfCounts();
        }
    }, [videos]);

    const getVideoStatus = (video) => {
        const now = new Date();

        let classDateTime = null;
        if (video.dateOfClass && video.TimeOfClass) {
            const [year, month, day] = video.dateOfClass.split('-').map(Number);
            const [hours, minutes, seconds = 0] = video.TimeOfClass.split(':').map(Number);
            classDateTime = new Date(year, month - 1, day, hours, minutes, seconds);
        }

        // Explicit live from backend
        if (video.isLive && !video.isLiveEnded) {
            return {
                status: 'live',
                label: 'Live Now',
                color: '#dc2626',
                bgColor: '#fef2f2',
                icon: 'radio-button-on',
            };
        }

        // Class time passed → Available
        if (classDateTime && now >= classDateTime) {
            return {
                status: 'completed',
                label: 'Available',
                color: '#16a34a',
                bgColor: '#f0fdf4',
                icon: 'checkmark-circle',
            };
        }

        // Future → Upcoming
        if (classDateTime && now < classDateTime) {
            return {
                status: 'upcoming',
                label: 'Upcoming',
                color: '#d97706',
                bgColor: '#fffbeb',
                icon: 'time',
            };
        }

        // Default
        return {
            status: 'completed',
            label: 'Available',
            color: '#16a34a',
            bgColor: '#f0fdf4',
            icon: 'checkmark-circle',
        };
    };

    const filteredVideos = useMemo(() => {
        let list = videos;

        if (searchQuery.trim()) {
            list = list.filter((video) =>
                video.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (filterType !== 'all') {
            list = list.filter((video) => getVideoStatus(video).status === filterType);
        }

        return list.sort((a, b) => {
            const statusA = getVideoStatus(a).status;
            const statusB = getVideoStatus(b).status;
            const order = { live: 0, upcoming: 1, completed: 2 };
            return order[statusA] - order[statusB];
        });
    }, [videos, searchQuery, filterType]);

    const openVideo = async (video) => {
        try {
            if (!video || !user?.id || !token || !id || !video.secureToken) {
                Alert.alert('Error', 'Unable to open video. Please try again.');
                return;
            }

            const status = getVideoStatus?.(video);

            if (status?.status === 'upcoming') {
                Alert.alert(
                    'Class Not Started',
                    'This class will be available after the scheduled start time.'
                );
                return;
            }

            navigation.navigate('PlayerScreen', {
                video: video.secureToken,
                batchId: video?.batchId ?? '',
                userId: String(user.id),
                token,
                courseId: String(id),
            });
        } catch (error) {
            console.error('openVideo error:', error);
            Alert.alert('Error', 'Failed to open video');
        }
    };

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
                <Text style={styles.errorTitle}>Unable to Load Classes</Text>
                <Text style={styles.errorSubtitle}>
                    Please check your connection and try again
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#6b7280" />
                    <TextInput
                        placeholder="Search classes, topics..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        placeholderTextColor="#9ca3af"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close-circle" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterSection}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'live', label: 'Live' },
                    { key: 'upcoming', label: 'Upcoming' },
                    { key: 'completed', label: 'Available' },
                ].map((filter) => (
                    <TouchableOpacity
                        key={filter.key}
                        onPress={() => setFilterType(filter.key)}
                        style={[
                            styles.filterTab,
                            filterType === filter.key && styles.filterTabActive,
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filterType === filter.key && styles.filterTextActive,
                            ]}
                        >
                            {filter.label}
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
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons
                            name="video-off-outline"
                            size={72}
                            color="#d1d5db"
                        />
                        <Text style={styles.emptyTitle}>No Classes Found</Text>
                        <Text style={styles.emptySubtitle}>
                            {searchQuery.trim()
                                ? 'Try a different search term'
                                : 'New classes will appear here'}
                        </Text>
                    </View>
                }
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
                            activeOpacity={0.7}
                            disabled={isUpcoming}
                        >
                            {/* Live Indicator */}
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
                                        <Image
                                            source={{ uri: item.imageUrl }}
                                            style={styles.thumbnail}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.thumbnail, styles.placeholderThumb]}>
                                            <MaterialCommunityIcons
                                                name="play-circle-outline"
                                                size={40}
                                                color="#ffffff"
                                            />
                                        </View>
                                    )}

                                    {/* Duration badge on thumbnail */}
                                    {item.duration && (
                                        <View style={styles.durationBadge}>
                                            <Text style={styles.durationText}>
                                                {item.duration}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Content Section */}
                                <View style={styles.infoSection}>
                                    {/* Title */}
                                    <Text style={styles.videoTitle} numberOfLines={2}>
                                        {item.title}
                                    </Text>

                                    {/* Status Badge */}
                                    <View
                                        style={[
                                            styles.statusBadge,
                                            { backgroundColor: status.bgColor },
                                        ]}
                                    >
                                        <Ionicons
                                            name={status.icon}
                                            size={14}
                                            color={status.color}
                                        />
                                        <Text style={[styles.statusText, { color: status.color }]}>
                                            {status.label}
                                        </Text>
                                    </View>

                                    {/* Date & Time */}
                                    {item?.dateOfClass && (
                                        <View style={styles.dateTimeRow}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={14}
                                                color="#6b7280"
                                            />
                                            <Text style={styles.dateText}>
                                                {new Date(item.dateOfClass).toLocaleDateString(
                                                    'en-IN',
                                                    {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    }
                                                )}
                                            </Text>

                                            {item?.TimeOfClass && !isLive && (
                                                <>
                                                    <Text style={styles.dateDivider}>•</Text>
                                                    <Ionicons
                                                        name="time-outline"
                                                        size={14}
                                                        color="#6b7280"
                                                    />
                                                    <Text style={styles.dateText}>
                                                        {item.TimeOfClass.substring(0, 5)}
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Right Actions */}
                                <View style={styles.actionsColumn}>
                                    {/* PDF Button - Only show if PDFs exist */}
                                    {pdfCount > 0 && (
                                        <TouchableOpacity
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                navigation.navigate('PdfNotes', {
                                                    videoId: item.id,
                                                    videoTitle: item.title,
                                                    batchId: id,
                                                });
                                            }}
                                            style={styles.pdfButton}
                                            activeOpacity={0.7}
                                        >
                                            <MaterialCommunityIcons
                                                name="file-pdf-box"
                                                size={24}
                                                color="#dc2626"
                                            />
                                            {pdfCount > 1 && (
                                                <View style={styles.pdfCountBadge}>
                                                    <Text style={styles.pdfCountText}>
                                                        {pdfCount}
                                                    </Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    {/* Chevron */}
                                    {!isUpcoming && (
                                        <Ionicons
                                            name="chevron-forward"
                                            size={24}
                                            color="#9ca3af"
                                            style={styles.chevron}
                                        />
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
        marginBottom: 8,
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