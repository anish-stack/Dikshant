import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../constant/color';

export default function LockedScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Feather name="lock" size={80} color={colors.primary} />
        <Text style={styles.title}>Course Locked</Text>
        <Text style={styles.subtitle}>Please enroll to watch videos</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
});