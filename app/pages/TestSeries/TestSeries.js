import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FlatList,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { LOCAL_ENDPOINT } from '../../constant/api';
import { useAuthStore } from '../../stores/auth.store';
import Layout from '../../components/layout';
import QuizCard from '../Quiz/QuizCard';


const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 10;

export default function TestSeries({ navigation }) {
  // ─── States ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'objective' | 'my'

  // Test Series (packages)
  const [testSeries, setTestSeries] = useState([]);
  const [purchasedMap, setPurchasedMap] = useState({});

  // Objective Quizzes (paginated)
  const [quizes, setQuizes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isPurchased, setIsPurchased] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  // UI states
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const { token } = useAuthStore();

  // ─── Haptics Helper ────────────────────────────────────────────────────────
  const triggerHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch { }
  }, []);

  // ─── Fetch Test Series Packages ────────────────────────────────────────────
  const fetchTestSeries = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setRefreshing(isRefresh);
    setError(null);

    try {
      const res = await axios.get(`${LOCAL_ENDPOINT}/testseriess`, {
        params: {
          limit: 120,
          sortBy: 'displayOrder',
          sortOrder: 'ASC',
        },
      });

      if (!res.data?.success) throw new Error('Failed to load');

      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setTestSeries(data);

      if (token) await checkPurchased(data);
    } catch (err) {
      setError('Failed to load test series. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const checkPurchased = useCallback(async (seriesList) => {
    if (!token || !seriesList.length) return;

    const map = {};
    await Promise.all(
      seriesList.map(async (series) => {
        try {
          const res = await axios.get(
            `${LOCAL_ENDPOINT}/orders/already-purchased`,
            {
              params: { itemId: series.id, type: 'test' },
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          map[series.id] = !!res.data?.purchased;
        } catch {
          map[series.id] = false;
        }
      })
    );
    setPurchasedMap(map);
  }, [token]);

  // ─── Fetch Objective Quizzes (paginated) ───────────────────────────────────
  const fetchQuizes = useCallback(async (page = 1, search = '', append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = { page, limit: ITEMS_PER_PAGE };
      if (search.trim()) params.search = search.trim();

      const res = await axios.get(`${LOCAL_ENDPOINT}/quiz/quizzes?displayIn=TestSeries`, { params });

      const newQuizes = res.data.data || [];
      const total = res.data.totalPages || 1;

      setQuizes(append ? (prev) => [...prev, ...newQuizes] : newQuizes);
      setTotalPages(total);
      setCurrentPage(page);
    } catch (err) {
      console.error('Quizzes fetch error:', err);
      if (!append) setError('Failed to load objective tests');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTestSeries();
  }, [fetchTestSeries]);

  useEffect(() => {
    if (activeTab === 'objective') {
      setQuizes([]);           // reset list when tab/search changes
      setCurrentPage(1);
      fetchQuizes(1, searchQuery, false);
    }
  }, [activeTab, searchQuery, fetchQuizes]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => {
    triggerHaptic();
    setActiveTab(tab);
  };

  const handleViewTestSeries = (id) => {
    triggerHaptic();
    navigation.navigate('testseries-view', {
      id,
      isPurchased: !!purchasedMap[id],
    });
  };



  const handleQuizPress = useCallback(
      (quiz) => {
        navigation.navigate("QuizDetails", {
          quizId: quiz.id,
          isPurchased,
        });
      },
      [navigation, isPurchased]
    );
  const handleLoadMore = () => {
    if (loadingMore || currentPage >= totalPages) return;
    fetchQuizes(currentPage + 1, searchQuery, true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'objective') {
      fetchQuizes(1, searchQuery, false);
    } else {
      fetchTestSeries(true);
    }
  };

  // ─── Computed / Filtered Data ──────────────────────────────────────────────
  const filteredTestSeries = useMemo(() => {
    if (!Array.isArray(testSeries)) return [];

    switch (activeTab) {
      case 'objective':
        return testSeries.filter((item) => item.displayIn === 'Quiz');
      case 'my':
        return testSeries.filter((item) => purchasedMap[item.id]);
      case 'all':
      default:
        return testSeries;
    }
  }, [activeTab, testSeries, purchasedMap]);

  // ─── Badge / Format Helpers ────────────────────────────────────────────────
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
      year: 'numeric',
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  const renderQuizList = () => (
    <FlatList
      data={quizes}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <QuizCard
          item={item}
          onPress={() => handleQuizPress(item)}
          setIsPurchased={setIsPurchased}
          isRefresh={refreshing}
        />
      )}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Feather name="file-text" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching quizzes' : 'No Objective Tests'}
          </Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Try different keywords' : 'Check back soon!'}
          </Text>
        </View>
      )}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color="#DC3545" />
          </View>
        ) : null
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
    />
  );

  const renderTestSeriesList = () => (
    <View style={styles.section}>
      {filteredTestSeries.map((item) => {
        const isPurchased = !!purchasedMap[item.id];
        const statusInfo = getStatusBadge(item.status);

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.testCard}
            activeOpacity={0.8}
            onPress={() => handleViewTestSeries(item.id)}
          >
            <View style={styles.testImageContainer}>
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.testImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <View style={[styles.levelBadge, { backgroundColor: statusInfo.color }]}>
                  <Text style={styles.levelText}>{statusInfo.text}</Text>
                </View>
                {isPurchased && (
                  <View style={styles.purchasedBadge}>
                    <Text style={styles.purchasedText}>Purchased</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.testContent}>
              <Text style={styles.testTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.testDescription} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Feather name="clock" size={14} color="#64748b" />
                  <Text style={styles.statText}>{item.timeDurationForTest} mins</Text>
                </View>
                <View style={styles.statItem}>
                  <Feather name="file-text" size={14} color="#64748b" />
                  <Text style={styles.statText}>Full Length</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.typeContainer}>
                  <Text style={styles.typeText}>
                    {item.type?.charAt(0).toUpperCase() + item.type?.slice(1) || 'Test'}
                  </Text>
                </View>
                <Text style={styles.expiryText}>
                  Expires: {formatDate(item.expirSeries)}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <View>
                  {item.discountPrice < item.price && (
                    <Text style={styles.originalPrice}>₹{item.price}</Text>
                  )}
                  <Text style={styles.price}>
                    ₹{item.discountPrice || item.price || 'Free'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.enrollButton,
                    isPurchased && styles.enrollButtonPurchased,
                  ]}
                  onPress={() => handleViewTestSeries(item.id)}
                >
                  <Text style={styles.enrollButtonText}>
                    {isPurchased ? 'View Series' : 'Enroll Now'}
                  </Text>
                  <Feather
                    name={isPurchased ? 'arrow-right-circle' : 'arrow-right'}
                    size={16}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
      <View style={{ height: 40 }} />
    </View>
  );

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
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => handleTabChange('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              📚 All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'objective' && styles.activeTab]}
            onPress={() => handleTabChange('objective')}
          >
            <Text style={[styles.tabText, activeTab === 'objective' && styles.activeTabText]}>
              📝 Objective
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && styles.activeTab]}
            onPress={() => handleTabChange('my')}
          >
            <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
              ⭐ My Tests
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar for objective tab */}
        {activeTab === 'objective' && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search objective tests..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              placeholderTextColor="#94a3b8"
            />
          </View>
        )}

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {loading && ((!quizes.length && activeTab === 'objective') || activeTab !== 'objective') ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC3545" />
              <Text style={styles.loadingText}>
                {activeTab === 'objective' ? 'Loading quizzes...' : 'Loading test series...'}
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === 'objective' ? (
            renderQuizList()
          ) : filteredTestSeries.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="bookmark" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'my' ? 'No Enrolled Tests' : 'No Test Series Found'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'my'
                  ? 'Enroll in a series to track progress'
                  : 'New series coming soon!'}
              </Text>
            </View>
          ) : (
            renderTestSeriesList()
          )}
        </ScrollView>
      </View>
    </Layout>
  );
}

// ─── Styles (mostly unchanged, minor cleanups) ───────────────────────────────
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
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
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#fff1f2' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  activeTabText: { color: '#DC3545' },

  searchContainer: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  content: { flex: 1 },
  section: { padding: 16, gap: 16 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  testCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  testImageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f1f5f9',
  },
  testImage: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
    padding: 12,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  purchasedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#16a34a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  purchasedText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  testContent: { padding: 16 },
  testTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  testDescription: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  price: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC3545',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  enrollButtonPurchased: { backgroundColor: '#16a34a' },
  enrollButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: { marginTop: 12, fontSize: 16, color: '#64748b' },
  errorContainer: { alignItems: 'center', paddingVertical: 80 },
  errorText: { marginTop: 12, fontSize: 16, color: '#ef4444', textAlign: 'center' },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#DC3545',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8 },
});