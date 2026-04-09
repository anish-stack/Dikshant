import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Animated,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { API_URL_LOCAL_ENDPOINT, LOCAL_ENDPOINT } from '../../constant/api';
import { useAuthStore } from '../../stores/auth.store';
import Layout from '../../components/layout';
import QuizCard from '../Quiz/QuizCard';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 100;
const BUNDLE_ENDPOINT = `${API_URL_LOCAL_ENDPOINT}/testseries-bundles`;

// ─── Tab Config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'all',       label: 'All Tests',        icon: 'layers' },
  { id: 'objective', label: 'Prelims',  icon: 'check-square' },
  { id: 'subjective', label: 'Mains',  icon: 'check-square' },
  { id: 'my', label: 'My Tests',   icon: 'star' },
];

// ─── Animated Tab Bar ─────────────────────────────────────────────────────────
function TabBar({ activeTab, onTabChange }) {
  const scrollRef = useRef();
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabsContent}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.75}
          >
            <Feather name={tab.icon} size={14} color={isActive ? '#fff' : '#64748b'} />
            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Bundle Card ───────────────────────────────────────────────────────────────
function BundleCard({ item, onPress }) {
  const savings = item.price - item.discountPrice;
  const savingsPercent = Math.round((savings / item.price) * 100);

  return (
    <TouchableOpacity style={styles.bundleCard} onPress={onPress} activeOpacity={0.88}>
      {/* Header gradient strip */}
      <View style={styles.bundleHeaderStrip}>
        <View style={styles.bundleHeaderLeft}>
          <View style={styles.bundleSavingsBadge}>
            <Text style={styles.bundleSavingsText}>{savingsPercent}% OFF</Text>
          </View>
          <Text style={styles.bundleTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.bundleDesc} numberOfLines={2}>{item.description}</Text>
        </View>
        <View style={styles.bundleIconBox}>
          <Feather name="package" size={32} color="#fff" />
          <Text style={styles.bundleSeriesCount}>{item.testSeries?.length || 0}</Text>
          <Text style={styles.bundleSeriesLabel}>Series</Text>
        </View>
      </View>

      {/* Included series mini-list */}
  {item.testSeries?.length > 0 && (
  <View style={styles.bundleSeriesList}>
    <Text style={styles.bundleIncludedLabel}>
      📦 Included in this bundle
    </Text>

    {item.testSeries.slice(0, 3).map((s) => (
      <View key={s.id} style={styles.bundleSeriesItem}>
        <Image
          source={{ uri: s.imageUrl }}
          style={styles.bundleSeriesThumb}
        />

        <View style={styles.bundleSeriesInfo}>
          <Text style={styles.bundleSeriesTitle} numberOfLines={1}>
            {s.title}
          </Text>

          <Text style={styles.bundleSeriesPrice}>
            ₹{s.discountPrice}
            <Text style={styles.bundleSeriesOriginal}>
              {"  "}₹{s.price}
            </Text>
          </Text>
        </View>

        <View style={styles.bundleSeriesCheck}>
          <Feather name="check" size={14} color="#10b981" />
        </View>
      </View>
    ))}

    {/* Show remaining count */}
    {item.testSeries.length > 3 && (
      <Text style={styles.moreSeriesText}>
        +{item.testSeries.length - 3} more
      </Text>
    )}
  </View>
)}

      {/* Price + CTA */}
      <View style={styles.bundlePriceRow}>
        <View>
          <Text style={styles.bundleOriginalPrice}>₹{item.price}</Text>
          <View style={styles.bundlePriceRow2}>
            <Text style={styles.bundleFinalPrice}>₹{item.discountPrice}</Text>
            <View style={styles.bundleGstTag}>
              <Text style={styles.bundleGstText}>+{item.gst}% GST</Text>
            </View>
          </View>
          <Text style={styles.bundleSaveText}>You save ₹{savings}</Text>
        </View>
        <TouchableOpacity style={styles.bundleCTA} onPress={onPress}>
          <Text style={styles.bundleCTAText}>Get Bundle</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Test Series Card ──────────────────────────────────────────────────────────
function TestSeriesCard({ item, isPurchased, onPress, formatDate }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'featured': return { text: 'Featured', color: '#7c3aed' };
      case 'popular':  return { text: 'Popular',  color: '#2563eb' };
      default:         return { text: 'New',      color: '#059669' };
    }
  };
  const statusInfo = getStatusBadge(item.status);

  return (
    <TouchableOpacity style={styles.testCard} onPress={onPress} activeOpacity={0.88}>
      <View style={styles.testImageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.testImage} resizeMode="cover" />
        <View style={styles.imageOverlay} />
        <View style={styles.imageBadges}>
          <View style={[styles.levelBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.levelText}>{statusInfo.text}</Text>
          </View>
          {isPurchased && (
            <View style={styles.purchasedBadge}>
              <Feather name="check-circle" size={11} color="#fff" />
              <Text style={styles.purchasedText}>Enrolled</Text>
            </View>
          )}
        </View>
        <View style={styles.durationPill}>
          <Feather name="clock" size={11} color="#fff" />
          <Text style={styles.durationText}>{item.timeDurationForTest} min</Text>
        </View>
      </View>

      <View style={styles.testContent}>
        <Text style={styles.testTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.testDescription} numberOfLines={2}>{item.description}</Text>

        <View style={styles.metaChips}>
          <View style={styles.chip}>
            <Feather name="file-text" size={11} color="#475569" />
            <Text style={styles.chipText}>Full Length</Text>
          </View>
          <View style={styles.chip}>
            <Feather name="calendar" size={11} color="#475569" />
            <Text style={styles.chipText}>Expires {formatDate(item.expirSeries)}</Text>
          </View>
          {item.type && (
            <View style={[styles.chip, styles.chipAccent]}>
              <Text style={styles.chipAccentText}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.priceRow}>
          <View>
            {item.discountPrice < item.price && (
              <Text style={styles.originalPrice}>₹{item.price}</Text>
            )}
            <Text style={styles.price}>₹{item.discountPrice || item.price}</Text>
          </View>
          <TouchableOpacity
            style={[styles.enrollButton, isPurchased && styles.enrollButtonPurchased]}
            onPress={onPress}
          >
            <Text style={styles.enrollButtonText}>
              {isPurchased ? 'Continue' : 'Enroll'}
            </Text>
            <Feather name={isPurchased ? 'play' : 'arrow-right'} size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function TestSeries({ navigation }) {
  const [activeTab, setActiveTab]         = useState('all');
  const [testSeries, setTestSeries]       = useState([]);
  const [purchasedMap, setPurchasedMap]   = useState({});
  const [bundles, setBundles]             = useState([]);
  const [quizes, setQuizes]               = useState([]);
  const [currentPage, setCurrentPage]     = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [isPurchased, setIsPurchased]     = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [error, setError]                 = useState(null);

  const { token } = useAuthStore();

  const triggerHaptic = useCallback(() => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
  }, []);

  // ── Fetch Bundles ─────────────────────────────────────────────────────────
  const fetchBundles = useCallback(async () => {
    setBundleLoading(true);
    try {
      const res = await axios.get(BUNDLE_ENDPOINT);
      if (res.data?.success) setBundles(res.data.data || []);
        if (token) await checkPurchased('',res.data.data);
    } catch (err) {
      console.error('Bundle fetch error:', err.response.data);
    } finally {
      setBundleLoading(false);
    }
  }, []);

  // ── Fetch Test Series ─────────────────────────────────────────────────────
  const fetchTestSeries = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setRefreshing(isRefresh);
    setError(null);
    try {
      const res = await axios.get(`${LOCAL_ENDPOINT}/testseriess`, {
        params: { limit: 120, sortBy: 'displayOrder', sortOrder: 'ASC' },
      });
      if (!res.data?.success) throw new Error();
      const data = Array.isArray(res.data.data) ? res.data.data : [];
      setTestSeries(data);
      if (token) await checkPurchased(data);
    } catch {
      setError('Failed to load test series. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

const checkPurchased = useCallback(async (seriesList ,bundleSeroies) => {
  if (!token || !seriesList.length) return;

  const map = {};

  await Promise.all(
    seriesList.map(async (series,bundleSeroies) => {
      try {
       
        const directRes = await axios.get(`${LOCAL_ENDPOINT}/orders/already-purchased`, {
          params: { itemId: series.id, type: "test" },
          headers: { Authorization: `Bearer ${token}` },
        });

        let isPurchased = !!directRes.data?.purchased;

       

        map[series.id] = isPurchased;
      } catch (err) {
        console.error(`Failed to check purchase for series ${series.id}:`, err.response.data);
        map[series.id] = false;
      }
    })
  );

  setPurchasedMap(map);
}, [token]);

  // ── Fetch Quizzes ─────────────────────────────────────────────────────────
  const fetchQuizes = useCallback(async (page = 1, search = '', append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const params = { page, limit: ITEMS_PER_PAGE };
      if (search.trim()) params.search = search.trim();
      const res = await axios.get(`${LOCAL_ENDPOINT}/quiz/quizzes?displayIn=TestSeries`, { params });
      const newQuizes = res.data.data || [];
      setQuizes(append ? (prev) => [...prev, ...newQuizes] : newQuizes);
      setTotalPages(res.data.totalPages || 1);
      setCurrentPage(page);
    } catch (err) {
      if (!append) setError('Failed to load objective tests');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { fetchTestSeries(); fetchBundles(); }, []);

  useEffect(() => {
    if (activeTab === 'objective') {
      setQuizes([]);
      setCurrentPage(1);
      fetchQuizes(1, searchQuery, false);
    }
  }, [activeTab, searchQuery]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => { triggerHaptic(); setActiveTab(tab); };

  const handleViewTestSeries = (id) => {
    triggerHaptic();
    navigation.navigate('testseries-view', { id, isPurchased: !!purchasedMap[id] });
  };

  const handleBundlePress = (bundle) => {
    triggerHaptic();
    navigation.navigate('bundle-view', { bundleId: bundle.id });
  };

  const handleQuizPress = useCallback((quiz) => {
    navigation.navigate('QuizDetails', { quizId: quiz.id, isPurchased });
  }, [navigation, isPurchased]);

  const handleLoadMore = () => {
    if (loadingMore || currentPage >= totalPages) return;
    fetchQuizes(currentPage + 1, searchQuery, true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'objective') fetchQuizes(1, searchQuery, false);
    else if (activeTab === 'bundle') { fetchBundles(); setRefreshing(false); }
    else fetchTestSeries(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // ── Filtered Data ─────────────────────────────────────────────────────────
  const filteredTestSeries = useMemo(() => {
    if (!Array.isArray(testSeries)) return [];
    switch (activeTab) {
      case 'objective': return testSeries.filter((i) => i.displayIn === 'Quiz');
      case 'my':        return testSeries.filter((i) => purchasedMap[i.id]);
      default:          return testSeries;
    }
  }, [activeTab, testSeries, purchasedMap]);

  // ── Stats for header ──────────────────────────────────────────────────────
  const enrolledCount = Object.values(purchasedMap).filter(Boolean).length;

  // ── Render ────────────────────────────────────────────────────────────────
  const renderBundles = () => {
    if (bundleLoading) return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DC3545" />
        <Text style={styles.loadingText}>Loading bundles...</Text>
      </View>
    );
    if (!bundles.length) return (
      <View style={styles.emptyState}>
        <Feather name="package" size={48} color="#cbd5e1" />
        <Text style={styles.emptyTitle}>No Bundles Yet</Text>
        <Text style={styles.emptyText}>Check back soon for exclusive bundles!</Text>
      </View>
    );
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionHeaderDot} />
          <Text style={styles.sectionHeaderText}>Exclusive Bundles</Text>
          <Text style={styles.sectionHeaderSub}>{bundles.length} available</Text>
        </View>
        {bundles.map((bundle) => (
          <BundleCard key={bundle.id} item={bundle} onPress={() => handleBundlePress(bundle)} />
        ))}
        <View style={{ height: 40 }} />
      </View>
    );
  };

  const renderTestSeriesList = () => (
    <View style={styles.section}>
      {filteredTestSeries.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="bookmark" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>
            {activeTab === 'my' ? 'No Enrolled Tests' : 'No Test Series Found'}
          </Text>
          <Text style={styles.emptyText}>
            {activeTab === 'my' ? 'Enroll in a series to track progress' : 'New series coming soon!'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderDot} />
            <Text style={styles.sectionHeaderText}>
              {activeTab === 'my' ? 'My Enrolled Tests' : 'All Test Series'}
            </Text>
            <Text style={styles.sectionHeaderSub}>{filteredTestSeries.length} series</Text>
          </View>
          {filteredTestSeries.map((item) => (
            <TestSeriesCard
              key={item.id}
              item={item}
              isPurchased={!!purchasedMap[item.id]}
              onPress={() => handleViewTestSeries(item.id)}
              formatDate={formatDate}
            />
          ))}
        </>
      )}
      <View style={{ height: 40 }} />
    </View>
  );

  const renderQuizList = () => (
    <View style={{ flex: 1 }}>
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>{searchQuery ? 'No matching quizzes' : 'No Objective Tests'}</Text>
            <Text style={styles.emptyText}>{searchQuery ? 'Try different keywords' : 'Check back soon!'}</Text>
          </View>
        )}
        ListFooterComponent={loadingMore ? (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator color="#DC3545" />
          </View>
        ) : null}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );

  const isLoadingMain = loading && (
    (activeTab !== 'objective') || (!quizes.length && activeTab === 'objective')
  );

  return (
    <Layout>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Test Series</Text>
            <Text style={styles.headerSubtitle}>Sharpen your skills, ace every exam</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statPill}>
              <Text style={styles.statPillNum}>{testSeries.length}</Text>
              <Text style={styles.statPillLabel}>Tests</Text>
            </View>
            {enrolledCount > 0 && (
              <View style={[styles.statPill, styles.statPillGreen]}>
                <Text style={[styles.statPillNum, { color: '#10b981' }]}>{enrolledCount}</Text>
                <Text style={styles.statPillLabel}>Enrolled</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Tabs ── */}
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* ── Search (Objective only) ── */}
        {activeTab === 'objective' && (
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search objective tests..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              placeholderTextColor="#94a3b8"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Content ── */}
        {activeTab === 'objective' ? (
          isLoadingMain ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DC3545" />
              <Text style={styles.loadingText}>Loading quizzes...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : renderQuizList()
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#DC3545" />}
          >
            {isLoadingMain ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#DC3545" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : activeTab === 'bundle' ? renderBundles()
              : renderTestSeriesList()
            }
          </ScrollView>
        )}
      </View>
    </Layout>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  headerStats: { flexDirection: 'row', gap: 8 },
  statPill: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statPillGreen: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  statPillNum: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  statPillLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 1 },

  // Tabs
  tabsScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeTab: { backgroundColor: '#DC3545', borderColor: '#DC3545' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  activeTabText: { color: '#fff' },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchIcon: { marginRight: 2 },
  searchInput: { flex: 1, fontSize: 15, color: '#0f172a', paddingVertical: 10 },

  content: { flex: 1 },
  section: { padding: 12, gap: 14 },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC3545',
  },
  sectionHeaderText: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
  sectionHeaderSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },

  // Bundle Card
  bundleCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',

  },
  bundleHeaderStrip: {
    backgroundColor: '#DC3545',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bundleHeaderLeft: { flex: 1, gap: 6 },
  bundleSavingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bundleSavingsText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  bundleTitle: { fontSize: 17, fontWeight: '800', color: '#fff', lineHeight: 22 },
  bundleDesc: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 18 },
  bundleIconBox: { alignItems: 'center', gap: 2 },
  bundleSeriesCount: { fontSize: 24, fontWeight: '900', color: '#fff', lineHeight: 28 },
  bundleSeriesLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  bundleSeriesList: { padding: 16, gap: 10 },
  bundleIncludedLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 4 },
  bundleSeriesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  bundleSeriesThumb: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#e2e8f0' },
  bundleSeriesInfo: { flex: 1, gap: 3 },
  bundleSeriesTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  bundleSeriesPrice: { fontSize: 13, fontWeight: '800', color: '#DC3545' },
  bundleSeriesOriginal: { fontSize: 12, color: '#94a3b8', fontWeight: '400', textDecorationLine: 'line-through' },
  bundleSeriesCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bundlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bundlePriceRow2: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  bundleOriginalPrice: { fontSize: 13, color: '#94a3b8', textDecorationLine: 'line-through' },
  bundleFinalPrice: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  bundleGstTag: { backgroundColor: '#fff7ed', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  bundleGstText: { fontSize: 10, color: '#f97316', fontWeight: '700' },
  bundleSaveText: { fontSize: 12, color: '#10b981', fontWeight: '700', marginTop: 2 },
  bundleCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC3545',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },
  bundleCTAText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Test Series Card
  testCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  testImageContainer: {
    width: '100%',
    aspectRatio: 16 / 7,
    backgroundColor: '#f1f5f9',
  },
  testImage: { width: '100%', height: '100%' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  imageBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  levelText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  purchasedText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  durationPill: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  testContent: { padding: 14 },
  testTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  testDescription: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 19 },

  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
  chipAccent: { backgroundColor: '#fff1f2', borderColor: '#fecdd3' },
  chipAccentText: { fontSize: 11, color: '#DC3545', fontWeight: '700' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  originalPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
  price: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  enrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC3545',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  enrollButtonPurchased: { backgroundColor: '#059669' },
  enrollButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // States
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: '#94a3b8' },
  errorContainer: { alignItems: 'center', paddingVertical: 80 },
  errorText: { marginTop: 12, fontSize: 15, color: '#ef4444', textAlign: 'center' },
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
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  moreSeriesText: {
  marginTop: 6,
  fontSize: 13,
  fontWeight: "600",
  color: "#2563eb",
},
});