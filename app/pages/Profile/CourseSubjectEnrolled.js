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
} from 'react-native';
import useSWR from 'swr';
import { fetcher } from '../../constant/fetcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import Layout from '../../components/layout';
import { useAuthStore } from '../../stores/auth.store';

const { width } = Dimensions.get('window');

export default function CourseSubjectEnrolled({ route, navigation }) {
    const { unlocked, courseId } = route.params || {};
    const { token, userId } = useAuthStore()
    const { data: batchData, isLoading: batchLoading } = useSWR(
        courseId ? `/batchs/${courseId}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const { data: videosData, isLoading: videosLoading } = useSWR(
        unlocked && courseId ? `/videocourses/batch/${courseId}` : null,
        fetcher,
        { revalidateOnFocus: false }
    );

    const isLoading = batchLoading || videosLoading;

    const batch = batchData || {};
    const videos = videosData?.data || [];
    const subjects = batch.subjects || [];

    // Count videos per subject
    const videoCountBySubject = videos.reduce((acc, video) => {
        const sid = video.subjectId;
        acc[sid] = (acc[sid] || 0) + 1;
        return acc;
    }, {});

    const subjectList = subjects.map(sub => ({
        ...sub,
        videoCount: videoCountBySubject[sub.id] || 0,
    }));

    const sortedSubjectList = [...subjectList].sort((a, b) => {
        if (b.videoCount > 0 && a.videoCount === 0) return 1;   // b has video → b first
        if (a.videoCount > 0 && b.videoCount === 0) return -1;  // a has video → a first

        return a.name.localeCompare(b.name);
    });

    const handleSubjectPress = (subjectId) => {
        navigation.navigate('view-all-videos', {

            id: courseId, token, userId,
            subjectId,
        });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Preparing your course...</Text>
            </View>
        );
    }

    if (!courseId || !unlocked || !batch.id) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyText}>Course not available</Text>
            </View>
        );
    }

    return (
        <Layout isHeaderShow={false}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Hero / Course Header */}
                <View style={styles.header}>
                    {batch.imageUrl ? (
                        <Image
                            source={{ uri: batch.imageUrl }}
                            style={styles.headerImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.headerImage, styles.headerPlaceholder]} />
                    )}


                </View>

                {/* Subjects Section */}
                <View style={styles.section}>
                    <View style={styles.subjectsHeaderRow}>
                        <Text style={styles.sectionTitle}>
                            Subjects {subjectList.length > 0 ? `(${subjectList.length})` : ''}
                        </Text>

                        {/* "Show All Videos" button - more prominent */}
                        <TouchableOpacity
                            style={[
                                styles.showAllButton,

                            ]}
                            onPress={() => navigation.navigate('view-all-videos', { id: courseId, token, userId })}
                        >
                            <Text
                                style={[
                                    styles.showAllText,

                                ]}
                            >
                                View All Videos
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={sortedSubjectList}
                        keyExtractor={item => item.id.toString()}
                        numColumns={2}
                        columnWrapperStyle={styles.row}
                        contentContainerStyle={styles.listContent}
                        scrollEnabled={false}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.subjectCard}
                                activeOpacity={0.88}
                                onPress={() => handleSubjectPress(item.id)}
                            >
                                <View style={styles.cardInner}>
                                    <Text style={styles.subjectEmojiName}>
                                        {item.name.includes(' ') ? item.name : item.name}
                                    </Text>

                                    <View style={[
                                        styles.videoBadge,
                                        item.videoCount === 0 && styles.videoBadgeEmpty
                                    ]}>
                                        <Text style={styles.videoCountText}>
                                            {item.videoCount} {item.videoCount === 1 ? 'video' : 'videos'}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <Text style={styles.emptyList}>No subjects available yet</Text>
                        }
                    />
                </View>

                {/* Extra space at bottom */}
                <View style={{ height: 40 }} />
            </ScrollView>
        </Layout>


    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
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
    },
    header: {
        height: 230,
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
        paddingTop: 40,
    },
    courseTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
    },
    courseSubtitle: {
        fontSize: 14,
        color: '#e2e8f0',
        marginBottom: 12,
        lineHeight: 20,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    price: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#facc15',
    },
    originalPrice: {
        fontSize: 16,
        color: '#94a3b8',
        textDecorationLine: 'line-through',
        marginLeft: 12,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#10b981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    section: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 16,
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
        shadowRadius: 8,
        elevation: 1,
        overflow: 'hidden',
    },
    cardInner: {
        padding: 16,
        paddingVertical: 20,
        alignItems: 'center',
    },
    subjectEmojiName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'center',
        lineHeight: 22,
    },
    videoBadge: {
        marginTop: 12,
        backgroundColor: '#6366f1',
        paddingHorizontal: 12,
        paddingVertical: 6,
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
    subjectsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },

    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },

    showAllButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#f1f5f9',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },

    showAllButtonActive: {
        backgroundColor: '#6366f1',
        borderColor: '#6366f1',
    },

    showAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },

    showAllTextActive: {
        color: '#ffffff',
    },
    emptyList: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 16,
        paddingVertical: 40,
    },
});