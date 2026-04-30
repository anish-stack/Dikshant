import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../utils/axios';

const { width } = Dimensions.get('window');

const COLORS = {
    background: '#FFFFFF',
    card: '#FFFFFF',
    border: '#E5E7EB',
    text: '#1F2937',
    muted: '#6B7280',
    correct: '#22C55E',
    wrong: '#EF4444',
    accent: '#EF4444',
    success: '#10B981',
    pending: '#F59E0B',
};

const TestScreenResultsAttemps = ({ route, navigation }) => {
    const { testId, testTitle } = route.params || {};

    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (testId) {
            fetchAllAttempts();
        }
    }, [testId]);

    const fetchAllAttempts = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get(`/new/tests/all/${testId}`);
            setAttempts(res.data.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load attempts. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewResult = (attempt) => {
        if (attempt.can_view_result) {
            navigation.navigate('NewResultScreen', {
                attemptId: attempt.attempt_id,
            });
        } else {
            Alert.alert('Not Available', 'Result is not available for this attempt yet.');
        }
    };

    const handleResumeTest = (attempt) => {
        if (attempt.can_resume) {
            // Navigate to test screen with resume flag
            navigation.navigate('StartTestPrelims', {
                testId: attempt.test_id,
                attemptId: attempt.attempt_id, // Pass attemptId to resume
                isResume: true,
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusInfo = (attempt) => {
        if (attempt.is_timed_out) return { label: 'Timed Out', color: '#EF4444' };
        if (attempt.status === 'submitted') return { label: 'Submitted', color: COLORS.success };
        if (attempt.status === 'in_progress') return { label: 'In Progress', color: COLORS.pending };
        return { label: attempt.status || 'Unknown', color: COLORS.muted };
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Loading your attempts...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Feather name="arrow-left" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{testTitle || 'Test Attempts'}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {error && (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity onPress={fetchAllAttempts} style={styles.retryBtn}>
                            <Text style={{ color: '#fff' }}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {attempts.length === 0 && !error ? (
                    <View style={styles.emptyBox}>
                        <Feather name="clipboard" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No attempts found</Text>
                    </View>
                ) : (
                    attempts.map((attempt, index) => {
                        const statusInfo = getStatusInfo(attempt);
                        const isSubmitted = attempt.status === 'submitted';

                        return (
                            <View key={attempt.attempt_id || index} style={styles.attemptCard}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.attemptNumber}>
                                        Attempt #{attempts.length - index}
                                    </Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                                            {statusInfo.label}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.dateRow}>
                                    <Text style={styles.dateLabel}>Started:</Text>
                                    <Text style={styles.dateValue}>{formatDate(attempt.started_at)}</Text>
                                </View>

                                {attempt.submitted_at && (
                                    <View style={styles.dateRow}>
                                        <Text style={styles.dateLabel}>Submitted:</Text>
                                        <Text style={styles.dateValue}>{formatDate(attempt.submitted_at)}</Text>
                                    </View>
                                )}

                                {isSubmitted && attempt.score !== null && (
                                    <View style={styles.scoreSection}>
                                        <Text style={styles.scoreText}>
                                            Score: <Text style={{ fontWeight: '800', color: '#1F2937' }}>{attempt.score}</Text>
                                        </Text>
                                        <Text style={styles.percentileText}>
                                            Rank #{attempt.rank} • {attempt.percentile}%ile
                                        </Text>
                                    </View>
                                )}

                                {/* Action Buttons */}
                                <View style={styles.buttonRow}>
                                    {attempt.can_resume && (
                                        <TouchableOpacity
                                            style={styles.resumeBtn}
                                            onPress={() => handleResumeTest(attempt)}
                                        >
                                            <Feather name="play" size={18} color="#fff" />
                                            <Text style={styles.resumeBtnText}>Resume Test</Text>
                                        </TouchableOpacity>
                                    )}

                                    {attempt.can_view_result && (
                                        <TouchableOpacity
                                            style={styles.viewResultBtn}
                                            onPress={() => handleViewResult(attempt)}
                                        >
                                            <Feather name="bar-chart-2" size={18} color="#fff" />
                                            <Text style={styles.viewResultBtnText}>View Result</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: { padding: 8, marginRight: 12 },
    headerTitle: { fontSize: 14, fontWeight: '700', color: '#1F2937' },

    scrollContent: { padding: 16 },

    attemptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    attemptNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },

    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    dateLabel: { color: '#6B7280', fontSize: 14 },
    dateValue: { color: '#374151', fontSize: 14, fontWeight: '500' },

    scoreSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    scoreText: { fontSize: 18, color: '#1F2937' },
    percentileText: { fontSize: 14, color: '#10B981', marginTop: 4, fontWeight: '600' },

    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    resumeBtn: {
        flex: 1,
        backgroundColor: '#10B981',
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    viewResultBtn: {
        flex: 1,
        backgroundColor: '#EF4444',
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    resumeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    viewResultBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#6B7280', fontSize: 16 },

    emptyBox: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: '#94A3B8',
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    errorText: { color: '#EF4444', textAlign: 'center' },
    retryBtn: {
        backgroundColor: '#EF4444',
        padding: 10,
        borderRadius: 8,
        alignSelf: 'center',
        marginTop: 10,
    },
});

export default TestScreenResultsAttemps;