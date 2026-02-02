import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../constant/fetcher';
import Layout from '../../components/layout';

const colors = {
    primary: "#DC2626",
    success: "#10B981",
    danger: "#EF4444",
    text: "#111827",
    textSecondary: "#4B5563",
    textLight: "#6B7280",
    border: "#E5E7EB",
    surface: "#F9FAFB",
    background: "#FFFFFF",
};

const FILTER_OPTIONS = [
    { key: 'all', label: 'All Attempts' },
    { key: 'passed', label: 'Passed' },
    { key: 'failed', label: 'Failed' },
];

export default function AllAttemptsQuiz() {
    const route = useRoute();
    const navigation = useNavigation();
    const { user } = useAuthStore();

    const { quizId } = route.params;

    const [quizTitle, setQuizTitle] = useState('');
    const [allAttempts, setAllAttempts] = useState([]);
    const [filteredAttempts, setFilteredAttempts] = useState([]);
    const [totalAllowed, setTotalAllowed] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');

    const fetchAttempts = async (isPullRefresh = false) => {
        if (!user?.id || !quizId) return;

        try {
            if (!isPullRefresh) setLoading(true);
            setRefreshing(isPullRefresh);
            setError(null);

            const response = await api.get(`/quiz/my-attempts/quiz/${quizId}`);
            console.log("Attempts response:",);
            if (response.data.success) {
                setQuizTitle(response.data.quizTitle || "Quiz");
                const attempts = response.data.attempts || [];
                setAllAttempts(attempts);
                setFilteredAttempts(attempts);
                setTotalAllowed(response.data.totalAttemptsAllowed || 0);
            } else {
                setError("Failed to load attempts");
            }
        } catch (err) {
            console.log("Error fetching attempts:", err);
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAttempts();
    }, [quizId, user?.id]);

    // Pull to refresh
    const onRefresh = useCallback(() => {
        fetchAttempts(true);
    }, [quizId, user?.id]);

    // Filter logic
    useEffect(() => {
        if (activeFilter === 'all') {
            setFilteredAttempts(allAttempts);
        } else if (activeFilter === 'passed') {
            setFilteredAttempts(allAttempts.filter(a => a.passed));
        } else if (activeFilter === 'failed') {
            setFilteredAttempts(allAttempts.filter(a => !a.passed));
        }
    }, [activeFilter, allAttempts]);

    const formatDate = (dateString) => {
        if (!dateString) return "In Progress";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading && !refreshing) {
        return (
            <Layout isHeaderShow={true}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading attempts...</Text>
                </View>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout isHeaderShow={true}>
                <View style={styles.center}>
                    <Feather name="alert-circle" size={48} color={colors.danger} />
                    <Text style={styles.errorText}>Error</Text>
                    <Text style={styles.errorSub}>{error}</Text>
                </View>
            </Layout>
        );
    }

    return (
        <Layout isRefreshing={refreshing} onRefresh={onRefresh} isHeaderShow={true}>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>{quizTitle}</Text>
                    <Text style={styles.subtitle}>
                        Total Attempts Allowed: {totalAllowed}
                    </Text>
                </View>

                {/* Filter Tabs */}
                <View style={styles.filterTabs}>
                    {FILTER_OPTIONS.map((filter) => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.filterTab,
                                activeFilter === filter.key && styles.filterTabActive
                            ]}
                            onPress={() => setActiveFilter(filter.key)}
                        >
                            <Text style={[
                                styles.filterText,
                                activeFilter === filter.key && styles.filterTextActive
                            ]}>
                                {filter.label}
                            </Text>
                            <Text style={styles.filterCount}>
                                ({activeFilter === filter.key
                                    ? filteredAttempts.length
                                    : filter.key === 'all' ? allAttempts.length
                                        : filter.key === 'passed' ? allAttempts.filter(a => a.passed).length
                                            : allAttempts.filter(a => !a.passed).length})
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {filteredAttempts.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="clock" size={64} color={colors.textLight} />
                        <Text style={styles.emptyTitle}>
                            {activeFilter === 'all' ? 'No Attempts Yet' : `No ${activeFilter === 'passed' ? 'Passed' : 'Failed'} Attempts`}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {activeFilter === 'all'
                                ? 'Start the quiz to see your attempt history here.'
                                : 'Try again to improve your score!'}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.attemptsList}>
                        {filteredAttempts.map((attempt) => {
                            const isPassed = attempt.passed;

                            return (
                                <View key={attempt.attemptId} style={styles.attemptCard}>
                                    <View style={styles.attemptHeader}>
                                        <Text style={styles.attemptNumber}>
                                            Attempt #{attempt.attemptNumber}
                                        </Text>
                                        <View style={[
                                            styles.statusBadge,
                                            isPassed ? styles.badgeSuccess : styles.badgeDanger
                                        ]}>
                                            <Text style={[
                                                styles.statusText,
                                                isPassed ? styles.textSuccess : styles.textDanger
                                            ]}>
                                                {isPassed ? "PASSED" : "FAILED"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.attemptDetails}>
                                        <View style={styles.detailRow}>
                                            <Feather name="calendar" size={14} color={colors.textLight} />
                                            <Text style={styles.detailText}>
                                                Started: {formatDate(attempt.startedAt)}
                                            </Text>
                                        </View>

                                        {attempt.completedAt && (
                                            <View style={styles.detailRow}>
                                                <Feather name="check-circle" size={14} color={colors.textLight} />
                                                <Text style={styles.detailText}>
                                                    Completed: {formatDate(attempt.completedAt)}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.scoreRow}>
                                            <Text style={styles.scoreText}>
                                                Score: {attempt.score || 0} marks
                                            </Text>
                                            <Text style={styles.percentageText}>
                                                {attempt.percentage ? `${attempt.percentage}%` : "N/A"}
                                            </Text>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.resultBtn}
                                        onPress={() => navigation.navigate('QuizResult', { attemptId: attempt.attemptId })}
                                    >
                                        <Feather name="bar-chart-2" size={18} color={colors.primary} />
                                        <Text style={styles.resultBtnText}>View Detailed Result</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </Layout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        color: colors.textLight,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
    },
    filterTabs: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        gap: 12,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterTabActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    filterTextActive: {
        color: '#fff',
    },
    filterCount: {
        marginLeft: 6,
        fontSize: 13,
        color: colors.textLight,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.textLight,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
    },
    attemptsList: {
        padding: 16,
    },
    attemptCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    attemptHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    attemptNumber: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeSuccess: {
        backgroundColor: colors.success + '15',
    },
    badgeDanger: {
        backgroundColor: colors.danger + '15',
    },
    statusText: {
        fontSize: 13,
        fontWeight: '700',
    },
    textSuccess: { color: colors.success },
    textDanger: { color: colors.danger },
    attemptDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: colors.border,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    percentageText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    resultBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 10,
        marginTop: 8,
    },
    resultBtnText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
});