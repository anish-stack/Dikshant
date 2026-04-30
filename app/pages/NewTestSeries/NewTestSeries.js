import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import api from '../../utils/axios';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TABS = [
    { key: 'all', label: 'All' },
    { key: 'prelims', label: 'Prelims' },
    { key: 'mains', label: 'Mains' },
    { key: 'combined', label: 'COMBO' },
    { key: 'mine', label: 'My Tests' },
];

const TYPE_COLOR = {
    prelims: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
    mains: { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    combo: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
};

const STATUS_COLOR = {
    live: { bg: '#DCFCE7', text: '#15803D' },
    scheduled: { bg: '#FEF9C3', text: '#854D0E' },
    draft: { bg: '#F1F5F9', text: '#475569' },
    result_published: { bg: '#DBEAFE', text: '#1D4ED8' },
    closed: { bg: '#FEE2E2', text: '#B91C1C' },
};

function getSeriesType(series) {

    return series.type
}

function formatPrice(price, discountPrice) {
    const p = parseFloat(price);
    const d = discountPrice ? parseFloat(discountPrice) : null;
    if (p === 0) return { label: 'FREE', original: null, discount: null };
    if (d && d < p) return { label: `₹${d.toFixed(0)}`, original: `₹${p.toFixed(0)}`, discount: Math.round(((p - d) / p) * 100) };
    return { label: `₹${p.toFixed(0)}`, original: null, discount: null };
}

function LiveDot() {
    return <View style={styles.liveDot} />;
}

function SeriesCard({ item, onPress }) {
    const seriesType = getSeriesType(item);
    const typeStyle = TYPE_COLOR[seriesType] || TYPE_COLOR.prelims;
    const pricing = formatPrice(item.price, item.discount_price);
    const liveCount = item.total_live || 0;
    const totalTests = item.total_tests || 0;
    console.log(item?.is_purchased)
    return (
        <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
            {/* Thumbnail */}
            <View style={styles.thumbContainer}>
                {item.thumbnail_url ? (
                    <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} resizeMode="contain" />
                ) : (
                    <View style={[styles.thumb, styles.thumbPlaceholder]}>
                        <Feather name="book-open" size={32} color="#CBD5E1" />
                    </View>
                )}
                {/* Type badge on image */}
                <View style={[styles.typeBadge, { backgroundColor: typeStyle.bg, borderColor: typeStyle.border }]}>
                    <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
                        {seriesType.toUpperCase()}
                    </Text>
                </View>
                {/* Purchased badge */}
                {item.is_purchased && (
                    <View style={styles.purchasedBadge}>
                        <Feather name="check-circle" size={12} color="#fff" />
                        <Text style={styles.purchasedBadgeText}>Purchased</Text>
                    </View>
                )}
            </View>

            {/* Content */}
            <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

                {item.description ? (
                    <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                ) : null}

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Feather name="file-text" size={13} color="#64748B" />
                        <Text style={styles.statText}>{totalTests} Tests</Text>
                    </View>
                    {liveCount > 0 && (
                        <View style={styles.statItem}>
                            <LiveDot />
                            <Text style={[styles.statText, { color: '#16A34A' }]}>{liveCount} Live</Text>
                        </View>
                    )}
                    {item.validity_days && (
                        <View style={styles.statItem}>
                            <Feather name="clock" size={13} color="#64748B" />
                            <Text style={styles.statText}>{item.validity_days}d</Text>
                        </View>
                    )}
                </View>



                {/* Price + CTA */}
                <View style={styles.cardFooter}>
                    <View>
                        {pricing.label === 'FREE' ? (
                            <Text style={styles.freeLabel}>FREE</Text>
                        ) : (
                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>{pricing.label}</Text>
                                {pricing.original && (
                                    <Text style={styles.originalPrice}>{pricing.original}</Text>
                                )}
                                {pricing.discount && (
                                    <View style={styles.discountBadge}>
                                        <Text style={styles.discountText}>{pricing.discount}% off</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {item.is_purchased ? (
                        <TouchableOpacity style={styles.viewBtn} onPress={() => onPress(item)}>
                            <Feather name="play-circle" size={14} color="#4F46E5" />
                            <Text style={styles.viewBtnText}>View</Text>
                        </TouchableOpacity>
                    ) : pricing.label === 'FREE' ? (
                        <TouchableOpacity style={styles.freeBtn} onPress={() => onPress(item)}>
                            <Text style={styles.freeBtnText}>Start Free</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.buyBtn} onPress={() => onPress(item)}>
                            <Text style={styles.buyBtnText}>Buy Now</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );
}

export default function NewTestSeries({ navigation }) {
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const LIMIT = 20;

    const fetchSeries = useCallback(async (pageNum = 1, refresh = false) => {
        if (pageNum === 1) refresh ? setRefreshing(true) : setLoading(true);
        else setLoadingMore(true);

        try {
            const response = await api.get(`/new/test-series?page=${pageNum}&limit=${LIMIT}`);
            const data = response.data?.data || response.data;
            const incoming = data?.series || [];
            const totalPages = data?.total_pages || 1;

            setSeries(prev => pageNum === 1 ? incoming : [...prev, ...incoming]);
            setHasMore(pageNum < totalPages);
            setPage(pageNum);
        } catch (err) {
            console.error('Failed to fetch series:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => { fetchSeries(1); }, [fetchSeries]);

    const onRefresh = useCallback(() => { fetchSeries(1, true); }, [fetchSeries]);

    const onEndReached = useCallback(() => {
        if (!loadingMore && hasMore) fetchSeries(page + 1);
    }, [loadingMore, hasMore, page, fetchSeries]);

    const filtered = series.filter(item => {
        const t = getSeriesType(item);
        if (activeTab === 'all') return true;
        if (activeTab === 'mine') return item.is_purchased;
        if (activeTab === 'combo') return t === 'combo';
        return t === activeTab;
    });

    const handlePress = (item) => {
        if (item.is_purchased) {
            navigation?.navigate('SeriesDetail', { seriesId: item.slug, purchased: true });
        } else {
            navigation?.navigate('SeriesDetail', { seriesId: item.slug, purchased: false });
        }
    };

    const renderItem = ({ item }) => <SeriesCard item={item} onPress={handlePress} />;

    const renderFooter = () => {
        if (!loadingMore) return <View style={{ height: 24 }} />;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Feather name="inbox" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No series found</Text>
                <Text style={styles.emptyDesc}>
                    {activeTab === 'mine' ? "You haven't purchased any series yet." : "Check back soon for new content."}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>

            <View style={styles.root}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Test Series</Text>
                    <Text style={styles.headerSubtitle}>Choose your preparation path</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabsWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                        {TABS.map(tab => (
                            <TouchableOpacity
                                key={tab.key}
                                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                                {tab.key === 'mine' && series.filter(s => s.is_purchased).length > 0 && (
                                    <View style={styles.tabBadge}>
                                        <Text style={styles.tabBadgeText}>{series.filter(s => s.is_purchased).length}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Count */}
                <View style={styles.countRow}>
                    <Text style={styles.countText}>{filtered.length} series</Text>
                </View>

                {/* List */}
                {loading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color="#4F46E5" />
                        <Text style={styles.loadingText}>Loading series...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        onEndReached={onEndReached}
                        onEndReachedThreshold={0.3}
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={renderEmpty}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F46E5']} />
                        }
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </SafeAreaView>

    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
    },
    tabsWrapper: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    tabsScroll: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        marginRight: 8,
        gap: 5,
    },
    tabActive: {
        backgroundColor: '#4F46E5',
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    tabTextActive: {
        color: '#fff',
    },
    tabBadge: {
        backgroundColor: '#EEF2FF',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    tabBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4F46E5',
    },
    countRow: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    countText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 14,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    thumbContainer: {
        position: 'relative',
    },
    thumb: {
        width: '100%',
        height: 160,
        backgroundColor: '#F1F5F9',
    },
    thumbPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    purchasedBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#16A34A',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    purchasedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    cardBody: {
        padding: 14,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 21,
    },
    cardDesc: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 17,
        marginTop: 5,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#16A34A',
    },
    pillsScroll: {
        marginTop: 10,
    },
    pillsRow: {
        flexDirection: 'row',
        gap: 6,
        paddingBottom: 2,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    pillText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    priceLabel: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A',
    },
    originalPrice: {
        fontSize: 13,
        color: '#94A3B8',
        textDecorationLine: 'line-through',
    },
    discountBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 5,
    },
    discountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#15803D',
    },
    freeLabel: {
        fontSize: 18,
        fontWeight: '800',
        color: '#16A34A',
    },
    buyBtn: {
        backgroundColor: '#4F46E5',
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 10,
    },
    buyBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    freeBtn: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 10,
    },
    freeBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#15803D',
    },
    viewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 10,
    },
    viewBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4F46E5',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    loadingText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    footerLoaderText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 10,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
    },
    emptyDesc: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});