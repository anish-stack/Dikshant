import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppAssets } from '../../hooks/useAssets';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

export default function FollowUs() {
  const { assets, loading } = useAppAssets();
  const [activeCard, setActiveCard] = useState(null);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const scaleAnims = React.useRef([...Array(6)].map(() => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const socialLinks = [
    {
      platform: 'Instagram',
      icon: 'logo-instagram',
      iconType: 'Ionicons',
      color: '#E1306C',
      gradient: ['#833AB4', '#E1306C', '#FD1D1D'],
      url: assets?.instagramLink,
      description: 'Daily motivation & updates',
      followers: '50K+',
    },
    {
      platform: 'YouTube',
      icon: 'logo-youtube',
      iconType: 'Ionicons',
      color: '#FF0000',
      gradient: ['#FF0000', '#CC0000'],
      url: assets?.youtubeLink,
      description: 'Free lectures & strategies',
      followers: '100K+',
    },
    {
      platform: 'Facebook',
      icon: 'logo-facebook',
      iconType: 'Ionicons',
      color: '#1877F2',
      gradient: ['#1877F2', '#0D5DBF'],
      url: assets?.facebookLink,
      description: 'Community discussions',
      followers: '75K+',
    },
    {
      platform: 'Telegram',
      icon: 'paper-plane',
      iconType: 'Ionicons',
      color: '#0088CC',
      gradient: ['#0088CC', '#006699'],
      url: assets?.telegramLink,
      description: 'Current affairs daily',
      followers: '40K+',
    },
    {
      platform: 'X (Twitter)',
      icon: 'logo-twitter',
      iconType: 'Ionicons',
      color: '#1DA1F2',
      gradient: ['#1DA1F2', '#0D8BD9'],
      url: assets?.twitterLink,
      description: 'Quick tips & news',
      followers: '30K+',
    },
    {
      platform: 'LinkedIn',
      icon: 'logo-linkedin',
      iconType: 'Ionicons',
      color: '#0A66C2',
      gradient: ['#0A66C2', '#004182'],
      url: assets?.linkedinLink,
      description: 'Professional network',
      followers: '25K+',
    },
  ];

  // Filter only available links
  const availableLinks = socialLinks.filter(link => link.url);

  const openLink = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Error opening link:', err);
    }
  };

  const handlePressIn = (index) => {
    setActiveCard(index);
    Animated.spring(scaleAnims[index], {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index) => {
    setActiveCard(null);
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <Ionicons name="refresh" size={40} color="#6366f1" />
            <Text style={styles.loadingText}>Loading...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <Animated.View 
          style={[
            styles.hero,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.logoContainer}>
            <Image
              source={
                assets?.appLogo 
                  ? { uri: assets.appLogo } 
                  : require('../../assets/small.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={styles.title}>Connect With Us</Text>
          <Text style={styles.subtitle}>
            Join our thriving community of UPSC aspirants
          </Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>300K+</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>1000+</Text>
              <Text style={styles.statLabel}>Success Stories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>Daily</Text>
              <Text style={styles.statLabel}>Updates</Text>
            </View>
          </View>
        </Animated.View>

        {/* Section Header */}
        {availableLinks.length > 0 && (
          <Animated.View 
            style={[
              styles.sectionHeader,
              { opacity: fadeAnim }
            ]}
          >
            <View style={styles.sectionTitleContainer}>
              <Feather name="heart" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>Follow Us On</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Choose your preferred platform
            </Text>
          </Animated.View>
        )}

        {/* Social Cards Grid */}
        <View style={styles.cardsGrid}>
          {availableLinks.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.cardWrapper,
                {
                  opacity: fadeAnim,
                  transform: [
                    { 
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, 50 + index * 10],
                      })
                    },
                    { scale: scaleAnims[index] }
                  ],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPressIn={() => handlePressIn(index)}
                onPressOut={() => handlePressOut(index)}
                onPress={() => openLink(item.url)}
              >
                <LinearGradient
                  colors={[...item.gradient, item.gradient[0]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.socialCard}
                >
                  {/* Floating particles effect */}
                  <View style={styles.particleContainer}>
                    <View style={[styles.particle, styles.particle1]} />
                    <View style={[styles.particle, styles.particle2]} />
                    <View style={[styles.particle, styles.particle3]} />
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.iconContainer}>
                      <View style={styles.iconBackground}>
                        <Ionicons 
                          name={item.icon} 
                          size={36} 
                          color="#ffffff" 
                        />
                      </View>
                      <View style={styles.iconGlow} />
                    </View>

                    <Text style={styles.platformName}>{item.platform}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                    
                    <View style={styles.followersContainer}>
                      <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.followersText}>{item.followers}</Text>
                    </View>

                    <View style={styles.followButton}>
                      <Text style={styles.followButtonText}>Follow Now</Text>
                      <Feather name="arrow-right" size={16} color="#ffffff" />
                    </View>
                  </View>

                  {/* Corner decoration */}
                  <View style={styles.cornerDecoration}>
                    <Feather name="check-circle" size={18} color="rgba(255,255,255,0.3)" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>

        {/* No links available message */}
        {availableLinks.length === 0 && (
          <View style={styles.noLinksContainer}>
            <Ionicons name="link-outline" size={60} color="#cbd5e1" />
            <Text style={styles.noLinksText}>Social links coming soon!</Text>
            <Text style={styles.noLinksSubtext}>
              We're setting up our social channels. Check back soon.
            </Text>
          </View>
        )}

        {/* CTA Footer */}
        {availableLinks.length > 0 && (
          <Animated.View 
            style={[
              styles.ctaCard,
              { opacity: fadeAnim }
            ]}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6', '#d946ef']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <View style={styles.ctaIconContainer}>
                <Ionicons name="rocket" size={32} color="#ffffff" />
              </View>
              <Text style={styles.ctaTitle}>Ready to Start Your UPSC Journey?</Text>
              <Text style={styles.ctaSubtitle}>
                Follow us on your favorite platform and never miss an update
              </Text>
              <View style={styles.benefitsContainer}>
                {[
                  '📚 Daily Study Materials',
                  '🎯 Expert Guidance',
                  '💡 Success Strategies',
                  '🤝 Peer Support',
                ].map((benefit, idx) => (
                  <View key={idx} style={styles.benefitItem}>
                    <Text style={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },

  // Hero Section
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  logo: {
    width: 120,
    height: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },

  // Section Header
  sectionHeader: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 28,
  },

  // Cards Grid
  cardsGrid: {
    gap: 16,
  },
  cardWrapper: {
    width: '100%',
  },
  socialCard: {
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 180,
    position: 'relative',
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  particle1: {
    top: -20,
    right: 20,
    width: 80,
    height: 80,
  },
  particle2: {
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
  },
  particle3: {
    top: '40%',
    right: -30,
    width: 70,
    height: 70,
  },
  cardContent: {
    padding: 24,
    position: 'relative',
    zIndex: 1,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  iconGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: 0,
    left: 0,
  },
  platformName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
    lineHeight: 20,
  },
  followersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  followersText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  cornerDecoration: {
    position: 'absolute',
    top: 16,
    right: 16,
  },

  // No Links
  noLinksContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noLinksText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#475569',
    marginTop: 16,
    marginBottom: 8,
  },
  noLinksSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },

  // CTA Card
  ctaCard: {
    marginTop: 24,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaGradient: {
    padding: 28,
    alignItems: 'center',
  },
  ctaIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  benefitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  benefitItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  benefitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});