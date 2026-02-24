import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Layout from './layout';
import WebView from 'react-native-webview';
import axios from 'axios';
import { API_URL_LOCAL_ENDPOINT } from '../constant/api';
import { colors } from '../constant/color';

const { width } = Dimensions.get('window');

export default function AnnouncementDetails({ route, navigation }) {
  const { id } = route.params || {};
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid announcement ID');
      setLoading(false);
      return;
    }

    const fetchAnnouncement = async () => {
      try {
        const response = await axios.get(`${API_URL_LOCAL_ENDPOINT}/announcements/${id}`);
        setAnnouncement(response.data);
      } catch (err) {
        console.error('Error fetching announcement:', err);
        setError('Failed to load announcement. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id]);

  const handleBatchPress = (batch) => {
    navigation.navigate('CourseDetail', {
      courseId: batch.id,
      batchData: batch,
    });
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors?.primary || '#6366f1'} />
          <Text style={styles.loadingText}>Loading announcement...</Text>
        </View>
      </Layout>
    );
  }

  if (error || !announcement) {
    return (
      <Layout>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'Announcement not found'}</Text>
        </View>
      </Layout>
    );
  }

  const publishDate = new Date(announcement.publishDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const htmlStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1f2937;
        padding: 0 16px 40px 16px;
        margin: 0;
        background-color: #ffffff;
      }
      p { margin: 12px 0; font-weight: 400; }
      strong { font-weight: 700; color: #111827; }
      em { font-style: italic; color: #374151; }
      a { color: #6366f1; text-decoration: underline; font-weight: 600; }
      img { max-width: 100%; height: auto; border-radius: 8px; margin: 16px 0; }
      ul, ol { padding-left: 20px; margin: 14px 0; }
      li { margin: 8px 0; }
      h1, h2, h3 { color: #111827; margin: 20px 0 12px 0; font-weight: 700; }
    </style>
  `;

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${htmlStyles}
      </head>
      <body>
        ${announcement.description || '<p style="text-align:center; color:#9ca3af;">No detailed content available.</p>'}
      </body>
    </html>
  `;

  return (
    <Layout isHeaderShow={true}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Header */}
        <View style={styles.headerSection}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>📢 Latest Update</Text>
          </View>
          
          <Text style={styles.title}>{announcement.title}</Text>
          
          <View style={styles.metaRow}>
            <Text style={styles.publishDate}>📅 {publishDate}</Text>
          </View>
        </View>

        {/* Key Message Highlight */}
        {announcement.message ? (
          <View style={styles.highlightBox}>
            <View style={styles.highlightDot} />
            <Text style={styles.highlightText}>{announcement.message}</Text>
          </View>
        ) : null}

        {/* Rich Description Content */}
        {announcement.description ? (
          <View style={styles.descriptionWrapper}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              style={styles.webview}
              scrollEnabled={true}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ) : null}

        {/* Promoted Batches Section */}
        {announcement.promotedBatches?.length > 0 && (
          <View style={styles.batchesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎓 Enroll Now & Transform Your Skills</Text>
              <Text style={styles.sectionSubtitle}>
                Limited spots available • Early bird benefits
              </Text>
            </View>

            <View style={styles.batchesList}>
              {announcement.promotedBatches.map((batch, index) => (
                <TouchableOpacity
                  key={batch.id}
                  style={styles.batchCard}
                  activeOpacity={0.7}
                  onPress={() => handleBatchPress(batch)}
                >
                  {/* Batch Image */}
                  <View style={styles.imageContainer}>
                    {batch.imageUrl ? (
                      <Image
                        source={{ uri: batch.imageUrl }}
                        style={styles.batchImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.batchImage, styles.imagePlaceholder]}>
                        <Text style={styles.placeholderText}>📚</Text>
                      </View>
                    )}
                  </View>

                  {/* Batch Details */}
                  <View style={styles.contentArea}>
                    <Text style={styles.batchName}>{batch.name}</Text>
                    
                    {/* Meta Information */}
                    <View style={styles.metaContainer}>
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          {batch.category?.toUpperCase() || 'Course'}
                        </Text>
                      </View>
                      
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          {batch.c_status || 'Upcoming'}
                        </Text>
                      </View>
                    </View>

                    {/* Start Date */}
                    <Text style={styles.startDate}>
                      Starts {new Date(batch.startDate).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  {/* CTA Arrow */}
                  {/* <View style={styles.ctaArrow}>
                    <Text style={styles.arrowIcon}>→</Text>
                  </View> */}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Spacing */}
        <View style={{ height: 60 }} />
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Header Section ──
  headerSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 32,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishDate: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },

  // ── Highlight Box ──
  highlightBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  highlightDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#0284c7',
    marginRight: 12,
    marginTop: 6,
  },
  highlightText: {
    flex: 1,
    fontSize: 13,
    color: '#0c4a6e',
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Description ──
  descriptionWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  webview: {
    height: 800,
    backgroundColor: 'transparent',
  },

  // ── Batches Section ──
  batchesSection: {
    marginTop: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  batchesList: {
    gap: 12,
  },

  // ── Batch Card ──
  batchCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    paddingRight: 12,
  },
  imageContainer: {
    width: 100,
    height: 100,
  },
  batchImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholderText: {
    fontSize: 32,
  },

  // ── Content Area ──
  contentArea: {
    flex: 1,
    paddingLeft: 12,
    paddingVertical: 8,
  },
  batchName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  metaChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  startDate: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },

  // ── CTA Arrow ──
  ctaArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  arrowIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
});
