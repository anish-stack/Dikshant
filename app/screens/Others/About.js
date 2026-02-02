import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Layout from '../../components/layout';
import * as Haptics from 'expo-haptics';
import styles from './commonStyle';

export function About() {
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const features = [
    {
      icon: 'book-open',
      title: 'Comprehensive Courses',
      description: 'Online, offline, and live classes for Prelims, Mains & Interview.',
    },
    {
      icon: 'clipboard',
      title: 'Test Series',
      description: 'Mock tests designed around the UPSC syllabus and exam pattern.',
    },
    {
      icon: 'users',
      title: 'Experienced Faculty',
      description: 'Led by Dr. S.S. Pandey, expert sociologist and UPSC mentor.', 
    },
    {
      icon: 'award',
      title: 'Proven Results',
      description: '600+ selections to date, consistent UPSC success. ',
    },
    {
      icon: 'heart',
      title: 'Scholarship Program',
      description: 'Free coaching for meritorious & economically weaker students.',
    },
  ];

  const teamMembers = [
    { name: 'Dr. S. S. Pandey', role: 'Founder & Lead Mentor', icon: 'user' },
    // You can add more team members if you have names and roles.
  ];

  const socialLinks = [
    { icon: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/dikshant.ias.7', color: '#1877f2' },
    { icon: 'twitter', label: 'Twitter', url: 'https://twitter.com/dikshantias', color: '#1da1f2' },
    { icon: 'instagram', label: 'Instagram', url: 'https://instagram.com/dikshantias', color: '#e4405f' },
    { icon: 'youtube', label: 'YouTube', url: 'https://youtube.com/dikshantias', color: '#ff0000' },
    { icon: 'send', label: 'Telegram', url: 'https://t.me/dikshantias', color: '#0088cc' },
  ];

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.appIconContainer}>
            <Feather name="book-open" size={48} color="#DC3545" />
          </View>
          <Text style={styles.appName}>Dikshant IAS</Text>
          <Text style={styles.appTagline}>
            India’s Premier UPSC Coaching Institute
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Est. since 2004</Text>
          </View>
        </View>

        {/* Mission / About */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.missionHeader}>
              <Feather name="target" size={24} color="#DC3545" />
              <Text style={styles.missionTitle}>Our Mission</Text>
            </View>
            <Text style={styles.missionText}>
              At Dikshant IAS, we are committed to shaping future civil servants through a holistic, concept-driven approach. Our goal is to build analytical thinking, clarity of thought, and strong answer-writing skills — not just to pass exams, but to nurture leaders with purpose and integrity. We believe in personalized mentorship, rigorous practice, and inclusive opportunities, including scholarship programs, to make UPSC preparation accessible and effective.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleMain}>Why Choose Dikshant IAS</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, idx) => (
              <View key={idx} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Feather name={feature.icon} size={24} color="#DC3545" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleMain}>Meet Our Team</Text>
          <View style={styles.card}>
            {teamMembers.map((member, idx) => (
              <View
                key={idx}
                style={[
                  styles.teamMember,
                  idx !== teamMembers.length - 1 && styles.settingItemBorder,
                ]}
              >
                <View style={styles.teamAvatar}>
                  <Feather name={member.icon} size={24} color="#DC3545" />
                </View>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{member.name}</Text>
                  <Text style={styles.teamRole}>{member.role}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleMain}>Connect With Us</Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((social, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.socialButton, { backgroundColor: social.color + '20' }]}
                onPress={() => {
                  triggerHaptic();
                Linking.openURL(social.url)
                }}
                activeOpacity={0.8}
              >
                <Feather name={social.icon} size={24} color={social.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Legal / Contact Links */}
        <View style={styles.section}>
          <View style={styles.card}>
            {[
            //   { icon: 'map-pin', label: 'Address', value: '289 Johar, Near Dussehra Ground, Mukherjee Nagar, Delhi' },
              { icon: 'phone', label: 'Phone', value: '93125-11015' },
              { icon: 'mail', label: 'Email', value: 'info@dikshantias.com' },
            ].map((link, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.actionItem,
                  idx !== 2 && styles.settingItemBorder,
                ]}
                onPress={triggerHaptic}
                activeOpacity={0.7}
              >
                <View style={styles.actionLeft}>
                  <View style={styles.actionIcon}>
                    <Feather name={link.icon} size={20} color="#DC3545" />
                  </View>
                  <Text style={styles.actionLabel}>{link.label}</Text>
                </View>
                <Text style={[styles.actionLabel, { color: '#4a5568' }]}>{link.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.aboutFooter}>
          <Text style={styles.footerText}>Committed to your IAS journey</Text>
          <Text style={styles.copyrightText}>© 2025 Dikshant IAS. All rights reserved.</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}
