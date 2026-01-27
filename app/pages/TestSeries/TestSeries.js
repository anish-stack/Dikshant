import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Layout from '../../components/layout';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from '../../stores/auth.store';

const { width } = Dimensions.get('window');

export default function TestSeries({ navigation }) {
  const [activeTab, setActiveTab] = useState('available');
  const [testSeries, setTestSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [purchasedMap, setPurchasedMap] = useState({});
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const { user, token } = useAuthStore();


  const fetchTestSeries = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await axios.get(`${LOCAL_ENDPOINT}/testseriess`, {
        params: {
          limit: 120,
          sortBy: 'displayOrder',
          sortOrder: 'ASC',
        },
      });

      if (response.data.success) {
        setTestSeries(response.data.data);
        checkPurchasedTestSeries(response.data.data);
      } else {
        setError('Failed to load test series');
      }
    } catch (err) {
      console.error('Error fetching test series:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTestSeries();
  }, []);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) { }
  };

  const handleTabChange = (tab) => {
    triggerHaptic();
    setActiveTab(tab);
  };

  const checkPurchasedTestSeries = async (seriesList = []) => {
    if (!Array.isArray(seriesList) || seriesList.length === 0) return;

    try {
      setCheckingPurchase(true);

      const results = {};

      await Promise.all(
        seriesList.map(async (series) => {
          try {
            const res = await axios.get(
              `${LOCAL_ENDPOINT}/orders/already-purchased`,
              {
                params: {
                  itemId: series.id,   // ✅ renamed item → series
                  type: "test",
                },
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            results[series.id] = res.data?.purchased === true;
          } catch (err) {
            results[series.id] = false;
          }
        })
      );

      setPurchasedMap(results);
    } catch (err) {
      console.error("Purchase check failed:", err);
    } finally {
      setCheckingPurchase(false);
    }
  };


  const handleView = (id, isPurchased) => {
    triggerHaptic()
    navigation.navigate("testseries-view", { id, isPurchased: isPurchased })
  }
  const myTestSeries = Array.isArray(testSeries)
    ? testSeries.filter((item) => purchasedMap?.[item?.id])
    : [];

  // console.log(myTestSeries)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'featured': return { text: 'Featured', color: '#a78bfa' };
      case 'popular': return { text: 'Popular', color: '#3b82f6' };
      default: return { text: 'New', color: '#10b981' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };


  return (
    <Layout>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Test Series</Text>
            <Text style={styles.headerSubtitle}>Practice makes perfect</Text>
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={triggerHaptic}>
            <Feather name="search" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && styles.activeTab]}
            onPress={() => handleTabChange('available')}
          >
            <Feather
              name="grid"
              size={18}
              color={activeTab === 'available' ? '#DC3545' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
              All Test Series
            </Text>
            <View style={[styles.badge, activeTab === 'available' && styles.activeBadge]}>
              <Text style={[styles.badgeText, activeTab === 'available' && styles.activeBadgeText]}>
                {testSeries.length}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'my-tests' && styles.activeTab]}
            onPress={() => handleTabChange('my-tests')}
          >
            <Feather
              name="bookmark"
              size={18}
              color={activeTab === 'my-tests' ? '#DC3545' : '#64748b'}
            />
            <Text style={[styles.tabText, activeTab === 'my-tests' && styles.activeTabText]}>
              My Test Series
            </Text>
            <View style={[styles.badge, activeTab === 'my-tests' && styles.activeBadge]}>
              <Text style={[styles.badgeText, activeTab === 'my-tests' && styles.activeBadgeText]}>
                {myTestSeries.length}
              </Text>

            </View>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTestSeries(true)}
            />
          }
        >
          {/* 1️⃣ Loading */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC3545" />
              <Text style={styles.loadingText}>Loading test series...</Text>
            </View>

            /* 2️⃣ Error */
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchTestSeries()}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>

            /* 3️⃣ Empty: Available */
          ) : activeTab === "available" && testSeries.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="clipboard" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Test Series Available</Text>
              <Text style={styles.emptyText}>
                Check back later for new series
              </Text>
            </View>

            /* 4️⃣ Empty: My Test Series */
          ) : activeTab === "my-tests" && myTestSeries.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="bookmark" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>No Enrolled Test Series</Text>
              <Text style={styles.emptyText}>
                Enroll in a test series to track your progress
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => handleTabChange("available")}
              >
                <Text style={styles.emptyButtonText}>
                  Browse Available Series
                </Text>
              </TouchableOpacity>
            </View>

            /* 5️⃣ MAIN LIST (Available OR My Test Series) */
          ) : (
            <View style={styles.section}>
              {(activeTab === "available" ? testSeries : myTestSeries).map((item) => {
                const isPurchased = purchasedMap[item.id];
                const statusInfo = getStatusBadge(item.status);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.testCard}
                    activeOpacity={0.8}
                    onPress={() => handleView(item.id, isPurchased)}
                  >
                    {/* IMAGE */}
                    <View style={styles.testImageContainer}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.testImage}
                        resizeMode="cover"
                      />

                      <View style={styles.imageOverlay}>
                        <View
                          style={[
                            styles.levelBadge,
                            { backgroundColor: statusInfo.color },
                          ]}
                        >
                          <Text style={styles.levelText}>
                            {statusInfo.text}
                          </Text>
                        </View>

                        {isPurchased && (
                          <View
                            style={{
                              position: "absolute",
                              top: 12,
                              right: 12,
                              backgroundColor: "#16a34a",
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                            >
                              Purchased
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* CONTENT */}
                    <View style={styles.testContent}>
                      <Text style={styles.testTitle} numberOfLines={2}>
                        {item.title}
                      </Text>

                      <Text
                        style={styles.testDescription}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>

                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Feather name="clock" size={14} color="#64748b" />
                          <Text style={styles.statText}>
                            {item.timeDurationForTest} mins
                          </Text>
                        </View>
                        <View style={styles.statItem}>
                          <Feather name="file-text" size={14} color="#64748b" />
                          <Text style={styles.statText}>
                            Full Length
                          </Text>
                        </View>
                      </View>

                      <View style={styles.metaRow}>
                        <View style={styles.typeContainer}>
                          <Text style={styles.typeText}>
                            {item.type?.charAt(0).toUpperCase() +
                              item.type?.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.expiryText}>
                          Expires: {formatDate(item.expirSeries)}
                        </Text>
                      </View>

                      <View style={styles.priceRow}>
                        <View>
                          {item.discountPrice < item.price && (
                            <Text style={styles.originalPrice}>
                              ₹{item.price}
                            </Text>
                          )}
                          <Text style={styles.price}>
                            ₹{item.discountPrice || item.price}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.enrollButton,
                            isPurchased && { backgroundColor: "#16a34a" },
                          ]}
                          onPress={() => handleView(item.id, isPurchased)}
                        >
                          <Text style={styles.enrollButtonText}>
                            {isPurchased ? "View Series" : "Enroll Now"}
                          </Text>
                          <Feather
                            name={
                              isPurchased
                                ? "arrow-right-circle"
                                : "arrow-right"
                            }
                            size={16}
                            color="#fff"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>

      </View>
    </Layout>
  );
}

// Keep all your existing styles (unchanged)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 2 },
  headerSubtitle: { fontSize: 14, color: '#64748b' },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  activeTab: { backgroundColor: '#eef2ff' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#DC3545' },
  badge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  activeBadge: { backgroundColor: '#DC3545' },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  activeBadgeText: { color: '#fff' },
  content: { flex: 1 },
  section: { paddingHorizontal: 16, gap: 16, paddingTop: 16 },
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  testImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9, // Perfect 16:9 ratio
    position: 'relative',
    backgroundColor: '#f1f5f9',

  },
  testImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.11)',
    padding: 12,
    justifyContent: 'flex-end',
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  testContent: { padding: 16 },
  testTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    lineHeight: 24,
  },
  testDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  typeContainer: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  expiryText: { fontSize: 12, color: '#64748b' },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  price: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  enrollButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: { marginTop: 12, fontSize: 16, color: '#ef4444', textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#DC3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  emptyButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});