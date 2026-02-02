import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../constant/fetcher';
import Layout from '../../components/layout';

const colors = {
  primary: "#6366F1",
  text: "#1E293B",
  textSecondary: "#64748B",
  textLight: "#94A3B8",
  border: "#E2E8F0",
  background: "#F8FAFC",
  white: "#FFFFFF",
};

export default function MyAllQuiz() {
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuizzes = async () => {
    try {
      const res = await api.get(`/orders/quiz-orders/${user.id}`);
      if (res.data.success) {
        setQuizzes(res.data.quizzes || []);
      }
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!user?.id) return;


    fetchQuizzes();
  }, [user?.id]);

  // Filtered quizzes based on search
  const filteredQuizzes = quizzes.filter(q =>
    q.quiz.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startQuiz = (quizId, canAttempt) => {
    if (!canAttempt) return;
    navigation.navigate("QuizDetails", { quizId: quizId, isPurchased: true });
  };

  const viewResult = (quizId) => {
    navigation.navigate('AllQuizAttempts', { quizId });
  };

  const onRefresh = useCallback(() => {
    fetchQuizzes(true);
  }, [user?.id]);

  if (loading) {
    return (
      <Layout isHeaderShow={true}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  return (
    <Layout isRefreshing={refreshing} onRefresh={onRefresh} isHeaderShow={true}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Test Your Knowledge with Quizzes</Text>
          <Text style={styles.bannerSubtitle}>
            You're just looking for a playful way to learn new facts, our quizzes are designed to entertain and educate.
          </Text>
          <TouchableOpacity style={styles.playNowBtn}>
            <Text style={styles.playNowText}>Play Now</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: "https://dikshantiasnew-web.s3.amazonaws.com/app/quizzes/trophy.png" }} // trophy image ya backend se
            style={styles.trophyImage}
            resizeMode="contain"
          />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={colors.textLight} />
          <TextInput
            placeholder="Search quizzes..."
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Feather name="sliders" size={20} color={colors.textLight} />
        </View>

        {/* Categories - Using Real Quiz Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {quizzes.slice(0, 8).map((item) => (
              <TouchableOpacity key={item.quiz.id} style={styles.categoryItem}>
                <Image
                  source={{ uri: item.quiz.image }}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
                <Text style={styles.categoryLabel} numberOfLines={1}>
                  {item.quiz.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity / Enrolled Quizzes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {filteredQuizzes.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="help-circle" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>No quizzes found</Text>
            </View>
          ) : (
            filteredQuizzes.map((item) => {
              const { quiz, amountPaid } = item;
              const progress = quiz.attemptsUsed > 0
                ? Math.round((quiz.attemptsUsed / quiz.attemptLimit) * 100)
                : 0;

              return (
                <>
                  <View key={quiz.id} style={styles.activityCard}>
                    <Image source={{ uri: quiz.image }} style={styles.activityImage} />

                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{quiz.title}</Text>
                      <Text style={styles.activityQs}>{quiz.totalQuestions} Questions</Text>

                      {/* Circular Progress */}

                      <Text style={styles.progressText}>
                        {quiz.attemptLimit - quiz.attemptsUsed} attempts remaining
                      </Text>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => startQuiz(quiz.id, quiz.canAttempt)}
                        >
                          <Feather name="eye" size={10} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtn}
                          onPress={() => viewResult(quiz.id)}
                        >
                          <Feather name="bar-chart-2" size={10} color={colors.primary} />
                        </TouchableOpacity>
                      </View>

                    </View>


                    {/* Action Buttons */}

                  </View>

                </>

              );
            })
          )}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  userId: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  diamondBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  diamondText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  banner: {
    backgroundColor: '#1E293B',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 20,
  },
  playNowBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  playNowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  trophyImage: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 120,
    height: 120,
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 16,
    marginBottom: 12,
  },
  categoryScroll: {
    paddingLeft: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textLight,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    // alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  activityQs: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 12,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  actionButtons: {
    gap: 12,
    marginTop: 12,
    flexDirection: 'row',
  },
  actionBtn: {
    width: 22,
    height: 22,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
});