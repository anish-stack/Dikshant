import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useQuizStore } from '../../../stores/useQuizStore';

export default function FirstAttemptMotivation({ navigation }) {
  const { quiz } = useQuizStore();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
      <Image source={require('../../assets/first-attempt.png')} style={{ width: 200, height: 200 }} />
      <Text style={{ fontSize: 28, fontWeight: '900', color: '#B11226', marginTop: 30 }}>
        Your First Attempt!
      </Text>
      <Text style={{ fontSize: 18, textAlign: 'center', marginTop: 20, color: '#4B5563' }}>
        This is your only chance to prove yourself in {quiz?.title}.
        Give it your best shot!
      </Text>
      <TouchableOpacity
        style={{ backgroundColor: '#B11226', padding: 18, borderRadius: 30, marginTop: 40, width: '80%' }}
        onPress={() => navigation.replace("QuizPlay")}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontSize: 18, fontWeight: '700' }}>
          Start Now
        </Text>
      </TouchableOpacity>
    </View>
  );
}