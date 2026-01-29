
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import Layout from '../../components/layout';
import Greet from '../../components/Greet';
import Slider from '../../components/slider';
import Categories from '../../components/Categories';
import Course from '../../screens/courses/Courses';
import Scholarship from '../../components/Scholarship';
import Announcement from '../../components/Announcement';

export default function Home() {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleJoinUs = () => {
    navigation.navigate('follow'); 
  };

  return (
    <Layout isRefreshing={refreshing} onRefresh={onRefresh}>
      <Greet refreshing={refreshing} />
      <Slider refreshing={refreshing} />
      <Announcement refreshing={refreshing} />
      <Categories refreshing={refreshing} />
      <Scholarship refreshing={refreshing} />
      <Course refreshing={refreshing} />
      
      {/* Join Us Button */}
      <View style={styles.joinUsContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={handleJoinUs}
          style={styles.joinUsButton}
        >
          <LinearGradient
          colors={['#ef4444', '#dc2626']}

            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.buttonContent}>
              <Feather name="users" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>Join Our Community</Text>
              <Feather name="arrow-right" size={18} color="#ffffff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.subText}>
          Follow us on social media for daily updates
        </Text>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  joinUsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  joinUsButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});