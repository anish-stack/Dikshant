import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuizStore } from '../../../stores/useQuizStore';

export default function QuizHeader({}) {
  const {
    quiz,
    currentQuestionIndex,
    totalQuestions,
    timeRemaining,
    currentQuestionTimer,      
  } = useQuizStore();

  // Overall time
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Progress
  const progress = totalQuestions > 0 
    ? ((currentQuestionIndex + 1) / totalQuestions) * 100 
    : 0;

  // Warning state for per-question timer (last 10 seconds)
  const isQuestionTimerCritical = currentQuestionTimer <= 10;
  const isQuestionTimerUrgent = currentQuestionTimer <= 20;

  return (
    <View style={styles.container}>
      {/* Top Row */}
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.quizTitle} numberOfLines={1}>
            {quiz?.title || 'Loading...'}
          </Text>
          <Text style={styles.progressText}>
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
        </View>

        <View style={styles.rightSection}>
          {/* Overall Timer */}
        

          {/* Per-Question Timer */}
          <View style={[
            styles.questionTimerContainer,
            isQuestionTimerCritical && styles.questionTimerCritical,
            isQuestionTimerUrgent && styles.questionTimerUrgent,
          ]}>
            <Ionicons 
              name="hourglass-outline" 
              size={20} 
              color={isQuestionTimerCritical ? '#fff' : '#B11226'} 
            />
            <Text style={[
              styles.questionTimerText,
              isQuestionTimerCritical && styles.questionTimerTextCritical
            ]}>
              {currentQuestionTimer}s
            </Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Optional: Auto-next hint when time is low */}
      {isQuestionTimerCritical && (
        <Text style={styles.autoNextWarning}>
          ⚠️ Auto next in {currentQuestionTimer} seconds!
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  quizTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },
  progressText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  overallTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  overallTimerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  questionTimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  questionTimerUrgent: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
  },
  questionTimerCritical: {
    backgroundColor: '#DC2626',
    borderColor: '#B91C1C',
    // Optional: pulse animation can be added later
  },
  questionTimerText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#B11226',
    marginLeft: 6,
  },
  questionTimerTextCritical: {
    color: '#FFFFFF',
    fontSize: 20,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#B11226',
    borderRadius: 5,
  },
  autoNextWarning: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
  },
});