import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useSWR from 'swr';
import { useAuthStore } from '../../stores/auth.store';
import { fetcher } from '../../constant/fetcher';
import CourseHeader from '../CourseComponets/CourseHeader';
import SmartVideoPlayer from '../../utils/SmartVideoPlayer';
import VideoList from '../CourseComponets/VideoList';
import { colors } from '../../constant/color';
import CommentsPanel from '../CourseComponets/CommentsPanel';
import DoubtsModal from '../CourseComponets/DoubtsModal';
import MyDoubtsModal from '../CourseComponets/MyDoubtsModal';
import { VideoProgressProvider } from '../../context/VideoProgressContext';
import LoadingScreen from '../CourseComponets/LoadingScreen';
import LockedScreen from '../CourseComponets/LockedScreen';
import { SocketProvider } from '../../context/SocketContext';

export default function CourseScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { courseId, unlocked = false, subjectId } = route.params || {};
  const { user } = useAuthStore();

  // UI / Player states
  const [currentVideo, setCurrentVideo] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [showDoubts, setShowDoubts] = useState(false);
  const [showMyDoubts, setShowMyDoubts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Data fetching
  const { data: batchData, isLoading: batchLoading, mutate: mutateBatch } = useSWR(
    courseId ? `/batchs/${courseId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: videosData, isLoading: videosLoading, mutate: mutateVideos } = useSWR(
    unlocked && courseId ? `/videocourses/batch/${courseId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const allVideos = videosData?.data || [];

  // Filter videos based on subjectId (if provided)
  const displayedVideos = subjectId
    ? allVideos.filter(video => video.subjectId === subjectId)
    : allVideos;

  const isLoading = batchLoading || videosLoading;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([mutateBatch(), mutateVideos()]);
    setRefreshing(false);
  };

  const handleVideoSelect = (video) => {
    setCurrentVideo(video);
    setShowComments(false);
    setShowDoubts(false);
    setShowMyDoubts(false);
  };

  const handleLiveEnded = () => {
    if (currentVideo) {
      setCurrentVideo(prev => ({
        ...prev,
        isLiveEnded: true,
      }));
    }
    mutateVideos(); // optional: refresh list to reflect any status change
  };

  // ────────────────────────────────────────────────
  //                  RENDER LOGIC
  // ────────────────────────────────────────────────

  if (isLoading) {
    return <LoadingScreen message="Loading your course..." />;
  }

  if (!courseId || !unlocked || !batchData?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Course not available</Text>
      </View>
    );
  }

  if (!unlocked) {
    return <LockedScreen />;
  }

  const isSubjectView = !!subjectId;
  const subjectName = isSubjectView
    ? batchData?.subjects?.find(s => s.id === subjectId)?.name || 'Subject'
    : null;

  return (
    <SocketProvider userId={user?.id}>
      <VideoProgressProvider userId={user?.id} courseId={courseId}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* Header - only when no video is selected */}
            {!currentVideo && (
              <CourseHeader
                batchData={batchData}
                videosCount={displayedVideos.length}
                // optional: pass subject name if in subject mode
                subjectName={subjectName}
              />
            )}

            {/* Video Player */}
            {currentVideo && (
              <SmartVideoPlayer
                video={currentVideo}
                userId={user?.id}
                courseId={courseId}
                onShowComments={() => setShowComments(true)}
                onShowDoubts={() => setShowDoubts(true)}
                onShowMyDoubts={() => setShowMyDoubts(true)}
                onLiveEnded={handleLiveEnded}
              />
            )}

            {/* Video List or Empty state */}
            {!currentVideo && (
              <>
                {displayedVideos.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {isSubjectView
                        ? `No videos available for ${subjectName} yet`
                        : 'No videos available in this course yet'}
                    </Text>
                  </View>
                ) : (
                  <VideoList
                    videos={displayedVideos}
                    startDate={batchData?.startDate}
                    endDate={batchData?.endDate}
                    subjectId={subjectId ? subjectId :""}
                    currentVideo={currentVideo}
                    courseId={courseId}
                    onVideoSelect={handleVideoSelect}
                    userId={user?.id}
                  />
                )}
              </>
            )}
          </ScrollView>

          {/* Side Panels / Modals */}
          <CommentsPanel
            visible={showComments}
            onClose={() => setShowComments(false)}
            videoId={currentVideo?.id}
            userId={user?.id}
          />

          <DoubtsModal
            visible={showDoubts}
            onClose={() => setShowDoubts(false)}
            videoId={currentVideo?.id}
            courseId={courseId}
            userId={user?.id}
            currentTime={0} // you might want to pass real current time later
          />

          <MyDoubtsModal
            visible={showMyDoubts}
            onClose={() => setShowMyDoubts(false)}
            videoId={currentVideo?.id}
            courseId={courseId}
            userId={user?.id}
          />
        </SafeAreaView>
      </VideoProgressProvider>
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 24,
  },
});