import {
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    ScrollView,
    Alert,
    StatusBar,
    StyleSheet,
} from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { Feather } from '@expo/vector-icons';
import api from '../../utils/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatPrice(price, discountPrice) {
    const p = parseFloat(price);
    const d = discountPrice ? parseFloat(discountPrice) : null;
    if (p === 0) return { label: 'FREE', original: null, discount: null };
    if (d && d < p) {
        return {
            label: `₹${d.toFixed(0)}`,
            original: `₹${p.toFixed(0)}`,
            discount: Math.round(((p - d) / p) * 100),
        };
    }
    return { label: `₹${p.toFixed(0)}`, original: null, discount: null };
}

function getTestStatus(test) {
    const now = new Date();
    const start = new Date(test.scheduled_start);
    const end = new Date(test.scheduled_end);
    if (now < start) return { tag: 'UPCOMING', color: '#F59E0B', started: false, ended: false };
    if (now >= start && now <= end) return { tag: 'LIVE', color: '#DC2626', started: true, ended: false };
    return { tag: 'ENDED', color: '#6B7280', started: false, ended: true };
}

function formatDateIST(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function isPrelims(type) {
    return type?.toLowerCase().includes('prelims');
}

// ─── TestCard ──────────────────────────────────────────────────────────────

const TestCard = ({
    test,
    isPurchased,
    onStartPrelims,
    onCheckQuestions,
    onCheckResults   // ← New prop
}) => {

    const status = getTestStatus(test);
    const prelims = isPrelims(test.type);

    const btnLabel = prelims
        ? status.ended
            ? 'Test Ended'
            : status.started
                ? 'Start Prelims Test'
                : 'Not Started Yet'
        : 'Check Questions';

    return (
        <View style={styles.testCard}>
            {/* Top row */}
            <View style={styles.testCardHeader}>
                <View style={styles.testNumberBox}>
                    <Text style={styles.testNumberText}>
                        {String(test.test_number).padStart(2, '0')}
                    </Text>
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.testTitle} numberOfLines={2}>{test.title}</Text>
                    <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, prelims ? styles.prelimsBadge : styles.mainsBadge]}>
                            <Text style={[styles.typeBadgeText, prelims ? styles.prelimsText : styles.mainsText]}>
                                {prelims ? 'PRELIMS' : 'MAINS'}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
                            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                            <Text style={[styles.statusText, { color: status.color }]}>{status.tag}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Schedule */}
            <View style={styles.scheduleBox}>
                <View style={styles.scheduleRow}>
                    <Feather name="calendar" size={11} color="#94A3B8" />
                    <Text style={styles.scheduleText}>
                        Starts: {formatDateIST(test.scheduled_start)}
                    </Text>
                </View>
                <View style={[styles.scheduleRow, { marginTop: 3 }]}>
                    <Feather name="clock" size={11} color="#94A3B8" />
                    <Text style={styles.scheduleText}>
                        Ends: {formatDateIST(test.scheduled_end)}
                    </Text>
                </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{test.duration_minutes} min</Text>
                    <Text style={styles.statLbl}>Duration</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{test.total_marks}</Text>
                    <Text style={styles.statLbl}>Marks</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statVal}>{test.is_free ? 'Free' : 'Paid'}</Text>
                    <Text style={styles.statLbl}>Access</Text>
                </View>
            </View>

            {/* Action Buttons Area */}
            {isPurchased && (
                <View style={styles.buttonContainer}>
                    {/* Main Action Button */}
                    <TouchableOpacity
                        style={prelims ? styles.prelimsBtn : styles.mainsBtn}
                        onPress={() => prelims ? onStartPrelims(test) : onCheckQuestions(test)}
                        disabled={prelims && (status.ended || !status.started)}
                        activeOpacity={0.8}
                    >
                        <Feather
                            name={prelims ? 'play-circle' : 'file-text'}
                            size={16}
                            color={prelims ? '#fff' : '#DC2626'}
                        />
                        <Text style={prelims ? styles.prelimsBtnText : styles.mainsBtnText}>
                            {btnLabel}
                        </Text>
                    </TouchableOpacity>

                    {/* New: Check Attempts & Results Button */}
                    <TouchableOpacity
                        style={styles.resultsBtn}
                        onPress={() => onCheckResults(test)}
                        activeOpacity={0.8}
                    >
                        <Feather name="bar-chart-2" size={16} color="#EF4444" />
                        <Text style={styles.resultsBtnText}>Check Attempts & Results</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
// ─── Main Screen ───────────────────────────────────────────────────────────

export default function SeriesDetail({ route, navigation }) {
    const { seriesId } = route.params;

    const [series, setSeries] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paying, setPaying] = useState(false);

    const fetchSeries = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/new/test-series/${seriesId}`);
            setSeries(res.data?.data?.series || res.data?.series);
        } catch {
            Alert.alert('Error', 'Failed to load series');
        } finally {
            setLoading(false);
        }
    }, [seriesId]);

    useEffect(() => { fetchSeries(); }, []);

    const handleBuy = async () => {
        try {
            setPaying(true);
            const res = await api.post('/new/purchases', {
                purchase_type: 'series',
                series_id: series.id,
            });
            const data = res.data.data;

            if (data.free) {
                Alert.alert('Success', 'Series unlocked!');
                fetchSeries();
                return;
            }

            RazorpayCheckout.open({
                key: data.key_id,
                amount: data.amount * 100,
                currency: 'INR',
                name: 'Dikshant IAS',
                description: data.item_title,
                order_id: data.order_id,
                theme: { color: '#DC2626' },
            })
                .then(async (payment) => {
                    await api.post('/new/purchases/verify', {
                        razorpay_order_id: payment.razorpay_order_id,
                        razorpay_payment_id: payment.razorpay_payment_id,
                        razorpay_signature: payment.razorpay_signature,
                        purchase_id: data.purchase_id,
                    });
                    Alert.alert('Success', 'Payment successful!');
                    fetchSeries();
                })
                .catch(() => Alert.alert('Failed', 'Payment failed. Try again.'));
        } catch (err) {
            Alert.alert('Error', err?.response?.data?.message || 'Something went wrong');
        } finally {
            setPaying(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#DC2626" />
            </SafeAreaView>
        );
    }

    if (!series) return null;

    const price = formatPrice(series.price, series.discount_price);
    const tests = series.tests || [];

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>


            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: series.is_purchased ? 24 : 40 }}>

                {/* Thumbnail */}
                {series.thumbnail_url && (
                    <Image source={{ uri: series.thumbnail_url }} style={styles.thumbnail} />
                )}

                {/* Series info */}
                <View style={styles.infoBox}>
                    <Text style={styles.seriesTitle}>{series.title}</Text>
                    {series.description ? (
                        <Text style={styles.seriesDesc}>{series.description}</Text>
                    ) : null}

                    <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>{price.label}</Text>
                        {price.original && <Text style={styles.priceStrike}>{price.original}</Text>}
                        {price.discount && (
                            <View style={styles.discountBadge}>
                                <Text style={styles.discountText}>{price.discount}% OFF</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.chipsRow}>
                        <View style={styles.chip}>
                            <Feather name="layers" size={12} color="#DC2626" />
                            <Text style={styles.chipText}>{series.total_tests} Tests</Text>
                        </View>
                        {series.validity_days ? (
                            <View style={styles.chip}>
                                <Feather name="calendar" size={12} color="#DC2626" />
                                <Text style={styles.chipText}>{series.validity_days}d Validity</Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Tests */}
                {tests.length > 0 && (
                    <View style={styles.testsSection}>
                        <Text style={styles.sectionTitle}>Tests ({tests.length})</Text>
                        {tests.map((test) => (
                            <TestCard
                                key={test.id}
                                test={test}
                                isPurchased={series.is_purchased}
                                onStartPrelims={(t) => navigation.navigate('TestScreen', { testId: t.id, seriesId: series.id })}
                                onCheckQuestions={(t) => navigation.navigate('QuestionListScreen', { testId: t.id })}
                                onCheckResults={(t) => navigation.navigate('TestScreenResultsAttemps', {
                                    testId: test.id || test.test_id,
                                    testTitle: test.title,
                                })}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Buy CTA — only if not purchased */}
            {!series.is_purchased && (
                <View style={styles.ctaBar}>
                    <View>
                        <Text style={styles.ctaPrice}>{price.label}</Text>
                        {price.original && <Text style={styles.ctaStrike}>{price.original}</Text>}
                    </View>
                    <TouchableOpacity
                        style={[styles.ctaBtn, paying && { backgroundColor: '#FCA5A5' }]}
                        onPress={handleBuy}
                        disabled={paying}
                        activeOpacity={0.85}
                    >
                        {paying
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={styles.ctaBtnText}>Buy Now</Text>
                        }
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

// ─── StyleSheet ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },


    thumbnail: { width: '100%', height: 230, resizeMode: 'stretch', backgroundColor: '#ffffff', },

    infoBox: { backgroundColor: '#fff', padding: 16 },
    seriesTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
    seriesDesc: { fontSize: 13, color: '#64748B', lineHeight: 20, marginBottom: 12 },

    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    priceLabel: { fontSize: 22, fontWeight: '900', color: '#DC2626' },
    priceStrike: { fontSize: 14, color: '#94A3B8', textDecorationLine: 'line-through' },
    discountBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    discountText: { fontSize: 11, fontWeight: '700', color: '#16A34A' },

    chipsRow: { flexDirection: 'row', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    chipText: { fontSize: 12, fontWeight: '600', color: '#DC2626' },

    divider: { height: 8, backgroundColor: '#F1F5F9' },

    testsSection: { padding: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 12 },

    // Test card
    testCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    testCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
    testNumberBox: {
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
    },
    testNumberText: { fontSize: 13, fontWeight: '900', color: '#DC2626' },
    testTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 5 },
    badgeRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },

    typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
    typeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
    prelimsBadge: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
    prelimsText: { color: '#1D4ED8' },
    mainsBadge: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
    mainsText: { color: '#6D28D9' },

    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, gap: 4 },
    statusDot: { width: 5, height: 5, borderRadius: 3 },
    statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

    scheduleBox: { marginBottom: 10 },
    scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    scheduleText: { fontSize: 11, color: '#64748B' },

    statsRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, marginBottom: 10,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statVal: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    statLbl: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    statDivider: { width: 1, height: 28, backgroundColor: '#E2E8F0' },

    prelimsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        backgroundColor: '#DC2626', paddingVertical: 11, borderRadius: 8,
    },
    prelimsBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

    mainsBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
        paddingVertical: 11, borderRadius: 8,
    },
    mainsBtnText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
    buttonContainer: {
        marginTop: 16,
        gap: 10,
    },

    resultsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',        // Light red background
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EF4444',
    },

    resultsBtnText: {
        color: '#EF4444',
        fontWeight: '700',
        fontSize: 15,
        marginLeft: 8,
    },
    // CTA
    ctaBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E2E8F0',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    ctaPrice: { fontSize: 20, fontWeight: '900', color: '#DC2626' },
    ctaStrike: { fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' },
    ctaBtn: {
        backgroundColor: '#DC2626', paddingVertical: 13, paddingHorizontal: 32,
        borderRadius: 10, alignItems: 'center', justifyContent: 'center', minWidth: 130,
    },
    ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});