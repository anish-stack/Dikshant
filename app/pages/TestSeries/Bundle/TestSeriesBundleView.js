import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import axios from 'axios';
import { useAuthStore } from '../../../stores/auth.store';
import { LOCAL_ENDPOINT } from '../../../constant/api';

const { width } = Dimensions.get('window');
const BUNDLE_ENDPOINT = 'https://www.app.api.dikshantias.com/api/testseries-bundles';

const formatDate = (d) => {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatPrice = (p) => (p != null ? `₹${Number(p).toLocaleString('en-IN')}` : 'Free');

// ─── Series Item (now clickable) ───────────────────────────────────────────────
function SeriesItem({ item, index, onPress, isPurchased }) {
  const isExpired = item.expirSeries && new Date(item.expirSeries) < new Date();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[styles.seriesCard, isExpired && styles.seriesCardExpired]}
      onPress={() => onPress(item)}
      disabled={!isPurchased}
    >
      <View style={styles.seriesNumber}>
        <Text style={styles.seriesNumberText}>{String(index + 1).padStart(2, '0')}</Text>
      </View>

      <Image source={{ uri: item.imageUrl }} style={styles.seriesImage} />

      <View style={styles.seriesContent}>
        <Text style={styles.seriesTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.seriesMeta}>
          <View style={styles.metaChip}>
            <Feather name="clock" size={12} color="#64748b" />
            <Text style={styles.metaText}>{item.timeDurationForTest || '?'} min</Text>
          </View>

          <View style={[
            styles.metaChip,
            item.type === 'subjective' ? styles.chipSubjective : styles.chipObjective,
          ]}>
            <Text style={[
              styles.metaText,
              item.type === 'subjective' ? { color: '#3b82f6' } : { color: '#10b981' },
            ]}>
              {item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : '—'}
            </Text>
          </View>

          {isExpired && (
            <View style={styles.chipExpired}>
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}
        </View>

        <Text style={styles.seriesDates}>
          {formatDate(item.testStartDate)} — {formatDate(item.expirSeries)}
        </Text>
      </View>

      {isPurchased ? (
        <Feather name="chevron-right" size={20} color="#94a3b8" />
      ) : (
        <View style={styles.lockIcon}>
          <Feather name="lock" size={18} color="#cbd5e1" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Payment Status Overlay ────────────────────────────────────────────────────
function PaymentStatusOverlay({ status }) {
  const opacity = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!status) return null;
  const isSuccess = status === 'success';

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={[styles.statusCard, isSuccess ? styles.successCard : styles.failedCard]}>
        <Feather
          name={isSuccess ? 'check-circle' : 'alert-circle'}
          size={64}
          color={isSuccess ? '#16a34a' : '#dc2626'}
        />
        <Text style={styles.statusTitle}>
          {isSuccess ? 'Payment Successful!' : 'Payment Failed'}
        </Text>
        <Text style={styles.statusMessage}>
          {isSuccess
            ? 'Your bundle is now unlocked. Enjoy learning!'
            : 'We couldn’t process the payment. Please try again.'}
        </Text>
        {isSuccess && <ActivityIndicator color="#16a34a" style={{ marginTop: 16 }} />}
      </View>
    </Animated.View>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const TestSeriesBundleView = ({ route, navigation }) => {
  const { bundleId, bundle: passedBundle } = route.params || {};
  const { token, user } = useAuthStore();

  const [bundle, setBundle] = useState(passedBundle || null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(!passedBundle);
  const [checkingPurchase, setCheckingPurchase] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  const fetchBundle = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BUNDLE_ENDPOINT}/${bundleId}`);
      if (res.data?.success) setBundle(res.data.data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load bundle details.');
    } finally {
      setLoading(false);
    }
  }, [bundleId]);

  const checkPurchase = useCallback(async () => {
    if (!token || !bundleId) {
      setCheckingPurchase(false);
      return;
    }
    try {
      const res = await axios.get(`${LOCAL_ENDPOINT}/orders/already-purchased`, {
        params: { itemId: bundleId, type: 'test_series_bundle' },
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsPurchased(!!res.data?.purchased);
    } catch {
      setIsPurchased(false);
    } finally {
      setCheckingPurchase(false);
    }
  }, [token, bundleId]);

  useEffect(() => {
    if (!passedBundle) fetchBundle();
    checkPurchase();
  }, [fetchBundle, checkPurchase, passedBundle]);

  const handleSeriesPress = (series) => {
    if (!isPurchased) {
      Alert.alert('Locked', 'Purchase the bundle to unlock this test series.');
      return;
    }
    navigation.navigate('testseries-view', {
      id: series.id,
      isPurchased: true,
    });
  };

  const createOrderAndPay = async () => {
    if (!bundle || paying) return;
    if (!token) {
      Alert.alert('Login Required', 'Please login to purchase.');
      return;
    }

    try {
      setPaying(true);
      setPaymentStatus(null);

      const orderRes = await axios.post(
        `${LOCAL_ENDPOINT}/orders`,
        {
          userId: user.id,
          type: 'test_series_bundle',
          itemId: bundle.id,
          amount: bundle.discountPrice || bundle.price,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const { razorOrder, key } = orderRes.data.data || orderRes.data;

      const options = {
        key,
        amount: razorOrder.amount,
        currency: 'INR',
        name: 'Dikshant IAS',
        description: bundle.title,
        image: 'https://dikshantiasnew-web.s3.amazonaws.com/logo.png',
        order_id: razorOrder.id,
        prefill: {
          email: user?.email || '',
          contact: user?.phone || '',
          name: user?.name || '',
        },
        theme: { color: '#B11226' },
      };

      RazorpayCheckout.open(options)
        .then((data) => verifyPayment(data))
        .catch(() => {
          setPaying(false);
          setPaymentStatus('failed');
          setTimeout(() => setPaymentStatus(null), 4500);
        });
    } catch {
      setPaying(false);
      setPaymentStatus('failed');
      setTimeout(() => setPaymentStatus(null), 4500);
    }
  };

  const verifyPayment = async (data) => {
    try {
      await axios.post(
        `${LOCAL_ENDPOINT}/orders/verify`,
        {
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPaying(false);
      setPaymentStatus('success');
      setIsPurchased(true); // optimistic update
      setTimeout(() => {
        setPaymentStatus(null);
        // Optional: refresh bundle or navigate
      }, 3800);
    } catch {
      setPaying(false);
      setPaymentStatus('failed');
      setTimeout(() => setPaymentStatus(null), 4500);
    }
  };

  if (loading || checkingPurchase) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#B11226" />
        <Text style={styles.loadingText}>
          {loading ? 'Loading premium bundle...' : 'Checking access...'}
        </Text>
      </SafeAreaView>
    );
  }

  if (!bundle) {
    return (
      <SafeAreaView style={styles.center}>
        <Feather name="alert-triangle" size={56} color="#ef4444" />
        <Text style={styles.errorTitle}>Bundle not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalTests = bundle.testSeries?.length || 0;
  const totalDuration = bundle.testSeries?.reduce((sum, s) => sum + (s.timeDurationForTest || 0), 0) || 0;
  const savings = (bundle.price || 0) - (bundle.discountPrice || 0);
  const gstAmount = Math.round(((bundle.discountPrice || 0) * (bundle.gst || 0)) / 100);

  const isBundleActive = isPurchased && (!bundle.expirBundle || new Date(bundle.expirBundle) > new Date());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backIcon}>
          <Feather name="arrow-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bundle.title}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.heroGradient}>
            <View style={styles.heroBadgeRow}>
              {isPurchased ? (
                <View style={styles.purchasedBadge}>
                  <Feather name="check" size={14} color="#fff" />
                  <Text style={styles.badgeText}>UNLOCKED</Text>
                </View>
              ) : (
                <View style={styles.savingsBadge}>
                  <Feather name="zap" size={14} color="#fff" />
                  <Text style={styles.badgeText}>SAVE {Math.round((savings / (bundle.price || 1)) * 100)}%</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroMainTitle}>{bundle.title}</Text>
            <Text style={styles.heroSubtitle}>{bundle.description || 'Comprehensive preparation bundle'}</Text>

            <View style={styles.heroStats}>
              <View style={styles.statItem}>
                <Feather name="book-open" size={18} color="#fff" />
                <Text style={styles.statValue}>{totalTests}</Text>
                <Text style={styles.statLabel}>Tests</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Feather name="clock" size={18} color="#fff" />
                <Text style={styles.statValue}>{totalDuration}</Text>
                <Text style={styles.statLabel}>Minutes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Feather name="calendar" size={18} color="#fff" />
                <Text style={styles.statValue}>
                  {bundle.expirBundle ? formatDate(bundle.expirBundle) : '∞'}
                </Text>
                <Text style={styles.statLabel}>Validity</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Purchased mode – focus on access */}
        {isPurchased ? (
          <>
            <View style={styles.accessCard}>
              <View style={styles.accessHeader}>
                <Feather name="unlock" size={24} color="#16a34a" />
                <Text style={styles.accessTitle}>Your Bundle is Active</Text>
              </View>
              <Text style={styles.accessText}>
                Start practicing now with full access to all test series, solutions, analytics & more.
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => navigation.navigate('TestSeries')}
              >
                <Text style={styles.startButtonText}>Start Practicing</Text>
                <Feather name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Included Test Series</Text>
            {bundle.testSeries?.length > 0 ? (
              bundle.testSeries.map((series, i) => (
                <SeriesItem
                  key={series.id}
                  item={series}
                  index={i}
                  onPress={handleSeriesPress}
                  isPurchased={true}
                />
              ))
            ) : (
              <Text style={styles.emptyText}>No test series included in this bundle.</Text>
            )}
          </>
        ) : (
          /* ── Purchase / Pricing Mode ── */
          <>
            <View style={styles.pricingCard}>
              <Text style={styles.priceLabel}>Bundle Price</Text>
              <View style={styles.priceRow}>
                <Text style={styles.currentPrice}>₹{bundle.discountPrice?.toLocaleString('en-IN') || '?'}</Text>
                <Text style={styles.originalPrice}>₹{bundle.price?.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={styles.gstLine}>+ ₹{gstAmount.toLocaleString('en-IN')} GST</Text>
              <Text style={styles.totalPay}>Total: ₹{(bundle.discountPrice + gstAmount).toLocaleString('en-IN')}</Text>
            </View>

            <Text style={styles.sectionTitle}>What's Included</Text>
            <View style={styles.featuresCard}>
              {[
                'Full access to all test series',
                'Real exam-like mock tests',
                'Detailed solutions & explanations',
                'Performance reports & analytics',
                'Valid until bundle expiry date',
              ].map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={styles.checkIcon}>
                    <Feather name="check" size={16} color="#10b981" />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Included Test Series</Text>
            {bundle.testSeries?.map((series, i) => (
              <SeriesItem
                key={series.id}
                item={series}
                index={i}
                onPress={handleSeriesPress}
                isPurchased={false}
              />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA – only shown when NOT purchased */}
      {!isPurchased && (
        <View style={styles.stickyFooter}>
          <View style={styles.stickyPrice}>
            <Text style={styles.stickyDiscount}>₹{bundle.discountPrice?.toLocaleString('en-IN')}</Text>
            <Text style={styles.stickyGst}>+GST</Text>
          </View>

          <TouchableOpacity
            style={[styles.payButton, paying && styles.payButtonDisabled]}
            onPress={createOrderAndPay}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="payment" size={20} color="#fff" />
                <Text style={styles.payButtonText}>Buy Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {paymentStatus && <PaymentStatusOverlay status={paymentStatus} />}
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    gap: 16,
  },
  loadingText: { fontSize: 16, color: '#64748b', marginTop: 12 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  backButton: {
    marginTop: 20,
    backgroundColor: '#B11226',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backIcon: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#0f172a' },

  scrollContent: { paddingBottom: 40 },

  hero: { marginBottom: 16 },
  heroGradient: {
    backgroundColor: '#B11226',
    padding: 24,
    paddingBottom: 32,
  },
  heroBadgeRow: { alignItems: 'flex-start' },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  purchasedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.4 },

  heroMainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginTop: 16,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 8,
    lineHeight: 22,
  },

  heroStats: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 8 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 12,
  },

  // Pricing (non-purchased)
  pricingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  priceLabel: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6 },
  currentPrice: { fontSize: 32, fontWeight: '900', color: '#B11226' },
  originalPrice: {
    fontSize: 18,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  gstLine: { fontSize: 14, color: '#f97316', marginTop: 4 },
  totalPay: { fontSize: 17, fontWeight: '700', color: '#1e293b', marginTop: 12 },

  // Features
  featuresCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  checkIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontSize: 15, color: '#334155', flex: 1 },

  // Series List
  seriesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  seriesCardExpired: { opacity: 0.6, backgroundColor: '#fef2f2' },
  seriesNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  seriesNumberText: { fontSize: 13, fontWeight: '900', color: '#64748b' },
  seriesImage: { width: 60, height: 60, borderRadius: 12, marginRight: 12 },
  seriesContent: { flex: 1, gap: 4 },
  seriesTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  seriesMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipSubjective: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  chipObjective: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  chipExpired: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  expiredText: { fontSize: 12, fontWeight: '700', color: '#ef4444' },
  seriesDates: { fontSize: 12, color: '#64748b' },
  lockIcon: { padding: 8 },

  // Purchased access card
  accessCard: {
    backgroundColor: '#f0fdf4',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
  },
  accessHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accessTitle: { fontSize: 20, fontWeight: '800', color: '#166534' },
  accessText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 20,
    gap: 10,
  },
  startButtonText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // Sticky footer (buy mode only)
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },
  stickyPrice: { alignItems: 'flex-start' },
  stickyDiscount: { fontSize: 26, fontWeight: '900', color: '#B11226' },
  stickyGst: { fontSize: 13, color: '#f97316', fontWeight: '600' },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B11226',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 10,
  },
  payButtonDisabled: { opacity: 0.6 },
  payButtonText: { fontSize: 17, fontWeight: '800', color: '#fff' },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  statusCard: {
    width: width * 0.82,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  successCard: { borderTopWidth: 6, borderTopColor: '#16a34a' },
  failedCard: { borderTopWidth: 6, borderTopColor: '#dc2626' },
  statusTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
  statusMessage: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },

  emptyText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 40,
  },
});

export default TestSeriesBundleView;