import React from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Alert,
} from 'react-native';
import useSWR from 'swr';
import { fetcher } from '../../constant/fetcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import Layout from '../../components/layout';
import { useAuthStore } from '../../stores/auth.store';

const { width } = Dimensions.get('window');

export default function CourseSubjectEnrolled({ route, navigation }) {
    const { unlocked, courseId, type, purchasedItem, batchIdOfSubject } = route.params || {};

    const { token, userId } = useAuthStore();

    // Fetch batch data
    const { data: batchData, isLoading: batchLoading, error: batchError } = useSWR(
        courseId ? `/batchs/${courseId}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    // Build API URL safely
    const apiUrl = React.useMemo(() => {
        if (!unlocked || !courseId) return null;

        if (type === "subject" && purchasedItem) {
            return `/videocourses/batch/${courseId}?subjectId=${purchasedItem}&batchIdOfSubject=${batchIdOfSubject || ''}`;
        }
        return `/videocourses/batch/${courseId}`;
    }, [unlocked, courseId, type, purchasedItem, batchIdOfSubject]);

    const {
        data: videosData,
        isLoading: videosLoading,
        mutate: mutateVideos,
        error: videosError
    } = useSWR(apiUrl, fetcher, {
        revalidateOnFocus: false,
        onError: (err) => {
            console.error('Failed to fetch videos:', err);
        }
    });

    const isLoading = batchLoading || videosLoading;

    // Safe data extraction
    const batch = batchData?.data || batchData || {};
    const videos = videosData?.data || [];

    // Safe subjects handling
    let subjects = [];
    if (batch?.subjects && Array.isArray(batch.subjects)) {
        if (type === "subject" && purchasedItem) {
            subjects = batch.subjects.filter((subject) =>
                subject?.id === purchasedItem
            );
        } else {
            subjects = [...batch.subjects];
        }
    }

    // Count videos per subject safely
    const videoCountBySubject = videos.reduce((acc, video) => {
        if (video?.subjectId) {
            acc[video.subjectId] = (acc[video.subjectId] || 0) + 1;
        }
        return acc;
    }, {});

    // Prepare subject list with video count
    const subjectList = subjects.map((sub) => ({
        ...sub,
        videoCount: videoCountBySubject[sub?.id] || 0,
    }));

    // Sort subjects (you can customize sorting logic)
    const sortedSubjectList = [...subjectList]

    const handleSubjectPress = (subjectId) => {
        if (!subjectId) {
            Alert.alert('Error', 'Invalid subject selected');
            return;
        }
        navigation.navigate('view-all-videos', {
            id: courseId,
            token,
            userId,
            subjectId,
        });
    };

    const handleViewAllVideos = () => {
        navigation.navigate('view-all-videos', {
            id: courseId,
            token,
            userId,
        });
    };

    // Error & Empty States
    if (batchError || videosError) {
        return (
            <Layout isHeaderShow={false}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>Failed to load course content</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={() => {
                            mutateVideos();
                        }}
                    >
                        <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </Layout>
        );
    }

    if (isLoading) {
        return (
            <Layout isHeaderShow={false}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.loadingText}>Preparing your course...</Text>
                </View>
            </Layout>
        );
    }

    if (!courseId || !unlocked || !batch?.id) {
        return (
            <Layout isHeaderShow={false}>
                <View style={styles.center}>
                    <Text style={styles.emptyText}>
                        Course not available or you don't have access.
                    </Text>
                </View>
            </Layout>
        );
    }

    return (
        <Layout isHeaderShow={false}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.header}>
                    {batch.imageUrl ? (
                        <Image
                            source={{ uri: batch.imageUrl }}
                            style={styles.headerImage}
                            resizeMode="cover"
                            onError={() => console.log('Image failed to load')}
                        />
                    ) : (
                        <View style={[styles.headerImage, styles.headerPlaceholder]} />
                    )}

                    {/* Optional Overlay Info */}
                    <View style={styles.headerOverlay}>
                        <Text style={styles.courseTitle} numberOfLines={2}>
                            {batch.name || batch.title || 'Untitled Course'}
                        </Text>
                        {batch.description && (
                            <Text style={styles.courseSubtitle} numberOfLines={2}>
                                {batch.description}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Subjects Section */}
                <View style={styles.section}>
                    <View style={styles.subjectsHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            Subjects {subjectList.length > 0 ? `(${subjectList.length})` : ''}
                        </Text>

                        {type !== "subject" && (
                            <TouchableOpacity
                                style={styles.showAllButton}
                                onPress={handleViewAllVideos}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.showAllText}>View All Videos</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {subjectList.length > 0 ? (
                        <FlatList
                            data={sortedSubjectList}
                            keyExtractor={(item) => `subject-${item?.id}`}
                            numColumns={2}
                            columnWrapperStyle={styles.row}
                            contentContainerStyle={styles.listContent}
                            scrollEnabled={false}
                            renderItem={({ item }) => {
                                const videoCount = item?.videoCount || 0;
                                const subjectName = item?.name || 'Unnamed Subject';

                                return (
                                    <TouchableOpacity
                                        style={styles.subjectCard}
                                        activeOpacity={0.88}
                                        onPress={() => handleSubjectPress(item?.id)}
                                    >
                                        <View style={styles.cardInner}>
                                            <Text style={styles.subjectName} numberOfLines={4}>
                                                {subjectName}
                                            </Text>

                                            <View style={[
                                                styles.videoBadge,
                                                videoCount === 0 && styles.videoBadgeEmpty
                                            ]}>
                                                <Text style={styles.videoCountText}>
                                                    {videoCount} {videoCount === 1 ? 'video' : 'videos'}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyList}>
                                No subjects available in this course yet.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Bottom padding */}
                <View style={{ height: 60 }} />
            </ScrollView>
        </Layout>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyText: {
        fontSize: 18,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 24,
    },
    errorText: {
        fontSize: 18,
        color: '#ef4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    retryText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    header: {
        height: 240,
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    headerPlaceholder: {
        backgroundColor: '#e2e8f0',
    },
    headerOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: 20,
        paddingTop: 50,
    },
    courseTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    courseSubtitle: {
        fontSize: 14,
        color: '#e2e8f0',
        lineHeight: 20,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    subjectsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    showAllButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    showAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    listContent: {
        paddingBottom: 20,
    },
    row: {
        justifyContent: 'space-between',
    },
    subjectCard: {
        width: (width - 60) / 2,
        marginBottom: 16,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
        overflow: 'hidden',
    },
    cardInner: {
        padding: 18,
        paddingVertical: 22,
        alignItems: 'center',
    },
    subjectName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'center',
        lineHeight: 24,
        flex: 1,
    },
    videoBadge: {
        marginTop: 14,
        backgroundColor: '#6366f1',
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    videoBadgeEmpty: {
        backgroundColor: '#cbd5e1',
    },
    videoCountText: {
        color: '#ffffff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyList: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 16,
        lineHeight: 24,
    },
});