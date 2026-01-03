import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    Image,
    StyleSheet,
    Linking,
    Alert,
} from 'react-native';
import React, { useState, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { fetcher } from '../../constant/fetcher';
import { useAuthStore } from '../../stores/auth.store';

export default function ViewAllVideos({ route, navigation }) {
    const { id, } = route.params || {};
    const { token, user } = useAuthStore()
    const { data: videosData, isLoading, error } = useSWR(
        id ? `/videocourses/batch/${id}` : null,
        fetcher,
        { revalidateOnFocus: true }
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');

    const videos = videosData?.success ? videosData.data : [];

    const parseDateTime = (dateStr, timeStr) => {
        if (!dateStr || !timeStr) return null;
        return new Date(`${dateStr}T${timeStr}.000Z`);
    };

    const getVideoStatus = (video) => {
        const now = new Date();
        const liveDateTime = parseDateTime(video.DateOfLive, video.TimeOfLIve);
        const classDateTime = parseDateTime(video.dateOfClass, video.TimeOfClass);

        if (
            video.isLive &&
            !video.isLiveEnded &&
            liveDateTime &&
            now >= new Date(liveDateTime.getTime() - 5 * 60 * 1000) &&
            now <= new Date(liveDateTime.getTime() + 3 * 60 * 60 * 1000)
        ) {
            return {
                status: 'live',
                label: 'LIVE NOW',
                color: '#dc2626',
                icon: 'circle',
                iconLibrary: 'materialCommunity',
            };
        }

        if (video.isLive && video.isLiveEnded) {
            return {
                status: 'completed',
                label: 'Available',
                color: '#16a34a',
                icon: 'lock-open',
                iconLibrary: 'materialCommunity',
            };
        }

        if (classDateTime && now < classDateTime) {
            return {
                status: 'upcoming',
                label: 'Upcoming',
                color: '#d97706',
                icon: 'lock',
                iconLibrary: 'materialCommunity',
            };
        }

        return {
            status: 'completed',
            label: 'Available',
            color: '#16a34a',
            icon: 'lock-open',
            iconLibrary: 'materialCommunity',
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
            // ❌ video missing
            if (!video) {
                Alert.alert("Error", "Video data not found");
                return;
            }

            // ❌ user missing
            if (!user?.id) {
                Alert.alert("Error", "User not authenticated");
                return;
            }

            // ❌ token missing
            if (!token) {
                Alert.alert("Error", "Session expired. Please login again.");
                return;
            }

            // ❌ courseId missing
            if (!id) {
                Alert.alert("Error", "Course information missing");
                return;
            }

            // ❌ secure token missing
            if (!video.secureToken) {
                Alert.alert("Error", "Video access token missing");
                return;
            }

            const status = getVideoStatus?.(video);

            if (status?.status === "upcoming") {
                Alert.alert(
                    "Locked",
                    "This video will be available after the class starts."
                );
                return;
            }

            // ✅ Safe params
            const params = new URLSearchParams({
                video: String(video.secureToken),
                batchId: String(video.batchId ?? ""),
                userId: String(user.id),
                token: String(token),
                courseId: String(id),
            }).toString();

            const url = `https://www.player.dikshantias.com/?${params}`;

            const supported = await Linking.canOpenURL(url);
            if (!supported) {
                Alert.alert("Error", "Cannot open this URL");
                return;
            }

            await Linking.openURL(url);
        } catch (error) {
            console.error("openVideo error:", error);
            Alert.alert("Error", "Failed to open video");
        }
    };


    if (isLoading) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.loadingText}>Loading videos...</Text>
            </SafeAreaView>
        );
    }

    if (error || !videosData?.success) {
        return (
            <SafeAreaView style={styles.centerContainer}>
                <Ionicons name="alert-circle" size={48} color="#dc2626" />
                <Text style={styles.errorText}>Failed to load videos</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputWrapper}>
                    <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
                    <TextInput
                        placeholder="Search videos..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        placeholderTextColor="#d1d5db"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#9ca3af" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                {['all', 'live', 'upcoming', 'completed'].map((type) => (
                    <TouchableOpacity
                        key={type}
                        onPress={() => setFilterType(type)}
                        style={[
                            styles.filterTab,
                            filterType === type && styles.filterTabActive,
                        ]}
                    >
                        <Text
                            style={[
                                styles.filterText,
                                filterType === type && styles.filterTextActive,
                            ]}
                        >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Video List */}
            <FlatList
                data={filteredVideos}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="video-off" size={64} color="#d1d5db" />
                        <Text style={styles.emptyText}>No videos found</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const status = getVideoStatus(item);
                    const IconComponent = status.iconLibrary === 'materialCommunity' ? MaterialCommunityIcons : Ionicons;

                    return (
                        <TouchableOpacity
                            onPress={() => openVideo(item)}
                            style={styles.videoCard}
                            activeOpacity={0.7}
                        >
                            <View style={styles.videoRow}>
                                {/* Thumbnail */}
                                {item?.imageUrl ? (
                                    <Image
                                        source={{ uri: item.imageUrl }}
                                        style={styles.thumbnail}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={[styles.thumbnail, styles.fallback]}>
                                        <MaterialCommunityIcons
                                            name="play-circle"
                                            size={48}
                                            color="#ffffff"
                                        />
                                    </View>
                                )}


                                {/* Content */}
                                <View style={styles.videoContent}>
                                    <View>
                                        <Text style={styles.videoTitle} numberOfLines={2}>
                                            {item.title}
                                        </Text>

                                        {/* Status Badge */}
                                        <View style={styles.statusBadge}>
                                            <IconComponent
                                                name={status.icon}
                                                size={14}
                                                color={status.color}
                                                style={styles.statusIcon}
                                            />
                                            <Text style={[styles.statusLabel, { color: status.color }]}>
                                                {status.label}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Date Info */}
                                   {item?.dateOfClass && (
    <>
      {/* LIVE & NOT ENDED */}
      {item?.isLive && !item?.isLiveEnded ? (
        <>
          <Text style={styles.liveBadge}>🔴 LIVE</Text>

          <Text style={styles.dateText}>
            {new Date(item.dateOfClass).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </Text>

          {item?.TimeOfLIve && (
            <Text style={styles.timeText}>
              {item.TimeOfLIve}
            </Text>
          )}
        </>
      ) : (
        /* NORMAL / RECORDED */
        <Text style={styles.dateText}>
          {new Date(item.dateOfClass).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </Text>
      )}
    </>
  )}
                                </View>

                                {/* Arrow Indicator */}
                                <Ionicons name="chevron-forward" size={24} color="#d1d5db" style={styles.arrowIcon} />
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
    },
    loadingText: {
        marginTop: 12,
        color: '#4b5563',
        fontSize: 16,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 18,
        color: '#dc2626',
        marginTop: 12,
        fontWeight: '600',
    },

    // Search Bar
    searchContainer: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 44,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1f2937',
    },

    // Filter Tabs
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    filterTab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterTabActive: {
        borderBottomWidth: 3,
        borderBottomColor: '#3b82f6',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#6b7280',
    },
    filterTextActive: {
        color: '#3b82f6',
        fontWeight: '600',
    },

    // Video List
    listContent: {
        padding: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 16,
        marginTop: 16,
        fontWeight: '500',
    },

    // Video Card
    videoCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    videoRow: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    thumbnail: {
        width: 80,
        height: 80,
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    videoContent: {
        flex: 1,
        justifyContent: 'space-between',
        minHeight: 80,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: 8,
        lineHeight: 22,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusIcon: {
        marginRight: 6,
    },
    statusLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: '500',
    },
    arrowIcon: {
        marginLeft: 8,
    },

});