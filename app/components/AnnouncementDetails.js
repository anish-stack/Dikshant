import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import React, { useState, useEffect } from 'react';
import Layout from './layout';
import WebView from 'react-native-webview';
import axios from 'axios';
import { API_URL_LOCAL_ENDPOINT } from '../constant/api';
import { colors } from '../constant/color'; // अगर colors file नहीं है तो हटा सकते हो

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
        setError('Failed to load announcement');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors?.primary || '#1976D2'} />
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

  // Custom CSS for WebView description
  const htmlStyles = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        line-height: 1.7;
        color: #333;
        padding: 0 20px 40px 20px;
        margin: 0;
        background-color: #fff;
      }
      p { margin: 16px 0; }
      strong { color: #000; font-weight: 700; }
      img { max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; }
      ul, ol { padding-left: 20px; margin: 16px 0; }
      h1, h2, h3 { color: #1976D2; margin: 24px 0 12px 0; }
    </style>
  `;

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${htmlStyles}
      </head>
      <body>
        ${announcement?.description || '<p>No detailed description available.</p>'}
      </body>
    </html>
  `;

  return (
    <Layout isHeaderShow={true}>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.title}>{announcement.title}</Text>

        {/* Publish Date */}
        <Text style={styles.date}>
          Published on:{' '}
          {new Date(announcement.publishDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>

        {/* Message (plain text) */}
        {announcement.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{announcement.message}</Text>
          </View>
        )}

        {/* Rich Description in WebView */}
        {announcement.description && (
          <WebView
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            style={styles.webview}
            scalesPageToFit={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true} 
          />
        )}
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    lineHeight: 28,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontWeight: '600',
  },
  messageContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  message: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  webview: {
    height:800,
    flex: 1,
    padding:12,
    backgroundColor: '#fff',
    marginTop: 8,
    marginBottom:12
  },
});