import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import api from '../../../constant/fetcher';
import { useAuthStore } from '../../../stores/auth.store';

const screenWidth = Dimensions.get('window').width;

const colors = {
  primary: "#DC2626",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#1e293b",
  textSecondary: "#64748b",
};

export default function QuizResult() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  const routeParams = route.params || {};
  const attemptIdFromRoute = routeParams.attemptId;
  console.log("Route Params:", routeParams);

  const [resultData, setResultData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  // Fetch result from API if attemptId is provided
  useEffect(() => {
    const fetchResultFromAPI = async () => {
      if (!attemptIdFromRoute || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/quiz/results/${attemptIdFromRoute}`);
        console.log("Fetched result data:", response.data);
        if (response.data.success) {
          setResultData(response.data.data);
        } else {
          setError("Failed to load result");
        }
      } catch (err) {
        console.log("Result fetch error:", err);
        setError("Network error. Using cached data.");
      } finally {
        setLoading(false);
      }
    };

    fetchResultFromAPI();
  }, [attemptIdFromRoute, user?.id]);

  // Fallback to route params if API fails or no attemptId
  const data = resultData || routeParams;

  const {
    percentage = 0,
    passed = false,
    score = 0,
    totalMarks = 80,
    totalQuestions = 10,
    attemptNumber = 1,
    questions = [],
    passingMarks = 45,
    quizTitle = "Quiz Result",
  } = data;

  const correctCount = questions.filter(q => q.is_correct).length;
  const incorrectCount = questions.filter(q => !q.is_correct && q.user_selected_option_id !== null).length;
  const notAttemptedCount = questions.filter(q => q.user_selected_option_id === null).length;

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const getCorrectOption = (question) => {
    if (!question.options) return null;
    return question.options.find(opt => opt.is_correct || opt.option_id === question.correct_option_id);
  };

  const getUserOption = (question) => {
    if (!question.options) return null;
    return question.options.find(opt => opt.option_id === question.user_selected_option_id);
  };

  const chartData = [
    { name: 'Correct', count: correctCount, color: '#10b981', legendFontColor: '#1e293b', legendFontSize: 12 },
    { name: 'Wrong', count: incorrectCount, color: '#ef4444', legendFontColor: '#1e293b', legendFontSize: 12 },
    { name: 'Skipped', count: notAttemptedCount, color: '#f59e0b', legendFontColor: '#1e293b', legendFontSize: 12 },
  ].filter(item => item.count > 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your result...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !data.questions) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={64} color={colors.danger} />
          <Text style={styles.errorText}>Failed to Load Result</Text>
          <Text style={styles.errorSub}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={passed ? ['#10b981', '#059669'] : ['#f59e0b', '#d97706']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.resultTitle}>
                {passed ? 'Congratulations!' : 'Keep Practicing!'}
              </Text>
              <Text style={styles.resultSubtitle}>
                {passed ? 'You have passed the quiz' : 'Better luck next time'}
              </Text>
            </View>
            <MaterialIcons
              name={passed ? 'emoji-events' : 'lightbulb-outline'}
              size={60}
              color="#fff"
            />
          </View>

          <View style={styles.scoreCircle}>
            {/* <Text style={styles.percentage}>{percentage.toFixed(0)}%</Text> */}
            <Text style={styles.scoreText}>{score}/{totalMarks} marks</Text>
          </View>

          <Text style={styles.attemptText}>Attempt #{attemptNumber}</Text>
        </LinearGradient>

        {/* Performance Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          {chartData.length > 0 && (
            <PieChart
              data={chartData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <MaterialIcons name="check-circle" size={28} color="#10b981" />
            <Text style={styles.statBig}>{correctCount}</Text>
            <Text style={styles.statSmall}>Correct</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons name="cancel" size={28} color="#ef4444" />
            <Text style={styles.statBig}>{incorrectCount}</Text>
            <Text style={styles.statSmall}>Wrong</Text>
          </View>
          <View style={styles.statBox}>
            <MaterialIcons name="remove-circle" size={28} color="#f59e0b" />
            <Text style={styles.statBig}>{notAttemptedCount}</Text>
            <Text style={styles.statSmall}>Skipped</Text>
          </View>
        </View>

        {/* Detailed Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Review ({questions.length} Questions)</Text>

          {questions.map((question, index) => {
            const isExpanded = expandedQuestions[question.question_id];
            const isNotAttempted = question.user_selected_option_id === null;

            let statusColor = isNotAttempted ? '#f59e0b' : question.is_correct ? '#10b981' : '#ef4444';
            let statusBg = isNotAttempted ? '#fef3c7' : question.is_correct ? '#d1fae5' : '#fee2e2';

            return (
              <View key={question.question_id} style={styles.questionCard}>
                <TouchableOpacity onPress={() => toggleQuestion(question.question_id)}>
                  <View style={styles.qHeader}>
                    <View style={styles.qLeft}>
                      <View style={[styles.qNumber, { backgroundColor: statusBg }]}>
                        <Text style={[styles.qNumberText, { color: statusColor }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text style={styles.qText} numberOfLines={isExpanded ? undefined : 2}>
                        {question.question_text}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                      size={24}
                      color="#94a3b8"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.expanded}>
                    {/* Options */}
                    {question.options?.map((opt) => {
                      const isCorrect = opt.is_correct;
                      const isSelected = opt.option_id === question.user_selected_option_id;

                      return (
                        <View
                          key={opt.option_id}
                          style={[
                            styles.option,
                            isCorrect && styles.correctOpt,
                            isSelected && !isCorrect && styles.wrongOpt,
                          ]}
                        >
                          <Text style={styles.optText}>{opt.option_text}</Text>
                          {isCorrect && <MaterialIcons name="check" size={20} color="#10b981" />}
                          {isSelected && !isCorrect && <MaterialIcons name="close" size={20} color="#ef4444" />}
                        </View>
                      );
                    })}

                    {isNotAttempted && (
                      <Text style={styles.skippedText}>⚠️ You skipped this question</Text>
                    )}

                    {question.explanation && (
                      <View style={styles.explanation}>
                        <Text style={styles.expTitle}>Explanation</Text>
                        <Text style={styles.expText}>{question.explanation}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => navigation.navigate('AllQuizes')}
          >
            <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.btnGradient}>
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <Text style={styles.btnText}>Try Similar Quiz</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.homeText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  header: { padding: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  resultSubtitle: { fontSize: 14, color: '#fff', opacity: 0.9, marginTop: 4 },
  scoreCircle: { alignItems: 'center', marginTop: 20 },
  percentage: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  scoreText: { fontSize: 16, color: '#fff', opacity: 0.9 },
  attemptText: { fontSize: 14, color: '#fff', opacity: 0.8, textAlign: 'center', marginTop: 8 },
  section: { padding: 20, backgroundColor: '#fff', marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginVertical: 16 },
  statBox: { flex: 1, alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  statBig: { fontSize: 32, fontWeight: 'bold', color: colors.text, marginVertical: 8 },
  statSmall: { fontSize: 13, color: colors.textSecondary },
  questionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  qLeft: { flexDirection: 'row', flex: 1, gap: 12 },
  qNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  qNumberText: { fontSize: 16, fontWeight: 'bold' },
  qText: { fontSize: 15, color: colors.text, flex: 1 },
  expanded: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#f1f5f9' },
  option: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: '#f8fafc', marginBottom: 8 },
  correctOpt: { backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#10b981' },
  wrongOpt: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#ef4444' },
  optText: { fontSize: 14, color: colors.text, flex: 1 },
  skippedText: { fontSize: 14, color: '#f59e0b', fontWeight: '600', textAlign: 'center', marginVertical: 12 },
  explanation: { marginTop: 12, padding: 12, backgroundColor: '#eff6ff', borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' },
  expTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  expText: { fontSize: 14, color: '#1e3a8a', lineHeight: 20 },
  buttons: { padding: 20, gap: 12 },
  retryBtn: { borderRadius: 16, overflow: 'hidden' },
  btnGradient: { flexDirection: 'row', padding: 16, justifyContent: 'center', alignItems: 'center', gap: 10 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  homeBtn: { padding: 16, backgroundColor: '#f1f5f9', borderRadius: 16, alignItems: 'center' },
  homeText: { fontSize: 16, color: '#3b82f6', fontWeight: '600' },
});