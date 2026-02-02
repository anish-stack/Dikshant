import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export default function QuestionCard({ question }) {
  return (
    <View style={styles.container}>
      <Text style={styles.questionText}>{question.question_text}</Text>

      {question.question_image && (
        <Image
          source={{ uri: question.question_image }}
          style={styles.questionImage}
          resizeMode="contain"
        />
      )}

      {question.marks && (
        <Text style={styles.marksText}>Marks: {question.marks}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 28,
  },
  questionImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
  },
  marksText: {
    fontSize: 14,
    color: '#B11226',
    fontWeight: '600',
    marginTop: 12,
  },
});