import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet, Dimensions
} from 'react-native';
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
    skipped: '#94A3B8',
    accent: '#EF4444',
    accentSoft: '#FEF2F2',
    gold: '#F59E0B',
    surface: '#F8FAFC',
};

const ScoreRing = ({ score, total, size = 140 }) => {
    const percentage = total > 0 ? Math.min((score / total) * 100, 100) : 0;
    const isGood = percentage >= 60;
    const isAverage = percentage >= 40;
    const color = isGood ? COLORS.correct : isAverage ? COLORS.gold : COLORS.wrong;

    return (
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <View style={[styles.scoreRingContainer, { width: size, height: size }]}>
                <View style={[styles.circle, { borderColor: COLORS.border, width: size, height: size, borderRadius: size / 2 }]} />
                <View style={[
                    styles.circle,
                    {
                        borderColor: color,
                        borderRightColor: 'transparent',
                        borderBottomColor: 'transparent',
                        width: size, height: size, borderRadius: size / 2,
                        transform: [{ rotate: `${-90 + (percentage * 3.6)}deg` }],
                    }
                ]} />
                <View style={styles.scoreCenter}>
                    <Text style={styles.scoreText}>{score.toFixed(1)}</Text>
                    <Text style={styles.scoreTotal}>/ {total}</Text>
                    <Text style={[styles.percentage, { color }]}>{percentage.toFixed(0)}%</Text>
                </View>
            </View>
        </View>
    );
};

const StatPill = ({ label, value, color }) => (
    <View style={[styles.statPill, { borderColor: color + '40' }]}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const InfoRow = ({ label, value, valueColor }) => (
    <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
);

const QuestionCard = ({ item, index }) => {
    const [expanded, setExpanded] = useState(false);

    const isCorrect = item.status === 'correct';
    const isWrong = item.status === 'wrong';
    const isSkipped = item.status === 'skipped' || item.status === 'unattempted';
    const statusColor = isCorrect ? COLORS.correct : isWrong ? COLORS.wrong : COLORS.skipped;
    const marksNum = parseFloat(item.marks_awarded || 0);

    return (
        <View style={styles.qCard}>
            <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
                <View style={[styles.qTopStrip, { backgroundColor: statusColor + '15', borderLeftColor: statusColor }]}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.qHeaderRow}>
                            <Text style={[styles.statusBadge, { backgroundColor: statusColor + '20', color: statusColor }]}>
                                {isCorrect ? '✓ Correct' : isWrong ? '✗ Wrong' : '— Skipped'}
                            </Text>
                            <View style={styles.marksContainer}>
                                <Text style={[styles.marksText, { color: marksNum > 0 ? COLORS.correct : marksNum < 0 ? COLORS.wrong : COLORS.muted }]}>
                                    {marksNum > 0 ? '+' : ''}{marksNum.toFixed(2)} / {parseFloat(item.max_marks || 0).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.qIndex}>Q{index + 1}  •  {item.source || ''}</Text>
                        <Text style={styles.qText} numberOfLines={expanded ? undefined : 2}>
                            {item.question}
                        </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: COLORS.muted, marginLeft: 8 }}>{expanded ? '▲' : '▼'}</Text>
                </View>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.qExpanded}>
                    {item.options?.map((opt, i) => {
                        const optNum = opt.number ?? (i + 1);
                        const isSelectedOpt = String(optNum) === String(item.selected_option);
                        const isCorrectOpt = String(optNum) === String(item.correct_option);

                        return (
                            <View
                                key={opt.id || i}
                                style={[
                                    styles.option,
                                    isCorrectOpt && styles.optionCorrect,
                                    isSelectedOpt && !isCorrectOpt && styles.optionWrong,
                                ]}
                            >
                                <View style={styles.optionRow}>
                                    <View style={[styles.optionBullet, {
                                        backgroundColor: isCorrectOpt ? COLORS.correct : isSelectedOpt && !isCorrectOpt ? COLORS.wrong : COLORS.border,
                                    }]}>
                                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{optNum}</Text>
                                    </View>
                                    <Text style={[
                                        styles.optionText,
                                        isCorrectOpt && { color: COLORS.correct, fontWeight: '600' },
                                        isSelectedOpt && !isCorrectOpt && { color: COLORS.wrong },
                                    ]}>
                                        {opt.text}
                                    </Text>
                                    {isCorrectOpt && <Text style={{ color: COLORS.correct, marginLeft: 6, fontWeight: '700' }}>✓</Text>}
                                    {isSelectedOpt && !isCorrectOpt && <Text style={{ color: COLORS.wrong, marginLeft: 6, fontSize: 11 }}>Your Ans</Text>}
                                </View>
                            </View>
                        );
                    })}

                    {/* Correct answer note for wrong */}
                    {isWrong && item.correct_option && (
                        <View style={styles.correctAnswerNote}>
                            <Text style={{ color: COLORS.correct, fontWeight: '600', fontSize: 13 }}>
                                ✓ Correct Answer: Option {item.correct_option}
                            </Text>
                        </View>
                    )}

                    {item.explanation ? (
                        <View style={styles.explanationBox}>
                            <Text style={styles.explanationTitle}>📖 Explanation</Text>
                            <Text style={styles.explanationText}>{item.explanation}</Text>
                        </View>
                    ) : null}
                </View>
            )}
        </View>
    );
};

export default function NewResultScreen({ route, navigation }) {
    const { attemptId } = route.params;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => { fetchResult(); }, []);

    const fetchResult = async () => {
        try {
            const res = await api.get(`/new/test/new/${attemptId}/result`);
            const d = res.data.data || res.data;
            // Normalize performance_summary fields into top-level
            if (d.performance_summary && !d.correct) {
                d.correct = d.performance_summary.correct;
                d.wrong = d.performance_summary.wrong;
                d.unattempted = d.performance_summary.unattempted;
                d.total_marks = d.performance_summary.total_questions * 2; // fallback
                d.accuracy = d.performance_summary.accuracy;
                d.attempt_rate = d.performance_summary.attempt_rate;
                d.score_percent = d.performance_summary.score_percent;
                d.negative_marks = d.performance_summary.negative_marks;
                d.remark = d.performance_summary.remark;
                d.total_questions = d.performance_summary.total_questions;
                d.attempted = d.performance_summary.attempted;
            }
            setData(d);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={styles.loadingText}>Preparing your result...</Text>
            </View>
        );
    }

    if (!data) {
        return (
            <View style={styles.center}>
                <Text style={{ color: COLORS.wrong, fontSize: 16 }}>Failed to load result</Text>
                <TouchableOpacity onPress={fetchResult} style={styles.retryBtnFull}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const {
        score, total_marks, correct, wrong, unattempted,
        questions, test_title, percentile, rank,
        accuracy, attempt_rate, score_percent, negative_marks,
        remark, total_questions, attempted
    } = data;

    const totalM = Number(total_marks) || 0;
    const scoreN = Number(score) || 0;
    const percentage = totalM > 0 ? ((scoreN / totalM) * 100).toFixed(1) : 0;

    const remarkColor = remark === 'Average' ? COLORS.gold : remark === 'Good' ? COLORS.correct : COLORS.wrong;

    return (
        <View style={styles.root}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.testTitle}>{test_title || 'Test Result'}</Text>
                    <Text style={styles.dateText}>Result Summary</Text>
                </View>

                {/* Score Card */}
                <View style={styles.scoreCard}>
                    <ScoreRing score={scoreN} total={totalM} />
                    <View style={styles.scoreInfo}>
                        <Text style={styles.percentageBig}>{percentage}%</Text>
                        <Text style={styles.scoreLabel}>Score: {scoreN.toFixed(2)} / {totalM}</Text>
                        {remark && (
                            <View style={[styles.remarkBadge, { backgroundColor: remarkColor + '20' }]}>
                                <Text style={[styles.remarkText, { color: remarkColor }]}>{remark}</Text>
                            </View>
                        )}
                        {rank ? <Text style={styles.rankText}>🏆 Rank #{rank}</Text> : null}
                        {percentile ? <Text style={styles.percentileText}>📊 {percentile}th Percentile</Text> : null}
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsContainer}>
                    <StatPill label="Correct" value={correct ?? 0} color={COLORS.correct} />
                    <StatPill label="Wrong" value={wrong ?? 0} color={COLORS.wrong} />
                    <StatPill label="Skipped" value={unattempted ?? 0} color={COLORS.skipped} />
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    {['overview', 'review'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'overview' ? 'Overview' : 'Question Review'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <View style={styles.content}>
                        <Text style={styles.sectionTitle}>Performance Summary</Text>

                        <View style={styles.infoCard}>
                            <InfoRow label="Total Questions" value={total_questions ?? questions?.length ?? 0} />
                            <View style={styles.divider} />
                            <InfoRow label="Attempted" value={attempted ?? 0} />
                            <View style={styles.divider} />
                            <InfoRow label="Correct" value={correct ?? 0} valueColor={COLORS.correct} />
                            <View style={styles.divider} />
                            <InfoRow label="Wrong" value={wrong ?? 0} valueColor={COLORS.wrong} />
                            <View style={styles.divider} />
                            <InfoRow label="Unattempted" value={unattempted ?? 0} valueColor={COLORS.skipped} />
                            <View style={styles.divider} />
                            <InfoRow label="Score" value={`${scoreN.toFixed(2)} / ${totalM}`} />
                            <View style={styles.divider} />
                            <InfoRow label="Negative Marks" value={negative_marks != null ? `-${parseFloat(negative_marks).toFixed(2)}` : '—'} valueColor={COLORS.wrong} />
                            <View style={styles.divider} />
                            <InfoRow label="Accuracy" value={accuracy != null ? `${accuracy}%` : '—'} valueColor={COLORS.correct} />
                            <View style={styles.divider} />
                            <InfoRow label="Attempt Rate" value={attempt_rate != null ? `${attempt_rate}%` : '—'} />
                            <View style={styles.divider} />
                            <InfoRow label="Score %" value={score_percent != null ? `${score_percent}%` : `${percentage}%`} />
                            {rank ? <><View style={styles.divider} /><InfoRow label="Rank" value={`#${rank}`} valueColor={COLORS.gold} /></> : null}
                            {percentile ? <><View style={styles.divider} /><InfoRow label="Percentile" value={`${percentile}th`} /></> : null}
                            {remark ? <><View style={styles.divider} /><InfoRow label="Remark" value={remark} valueColor={remarkColor} /></> : null}
                        </View>

                        {/* Subject Breakdown */}
                        {questions?.length > 0 && (() => {
                            const subjectMap = {};
                            questions.forEach(q => {
                                const src = q.source || 'General';
                                if (!subjectMap[src]) subjectMap[src] = { correct: 0, wrong: 0, skipped: 0, total: 0 };
                                subjectMap[src].total++;
                                if (q.status === 'correct') subjectMap[src].correct++;
                                else if (q.status === 'wrong') subjectMap[src].wrong++;
                                else subjectMap[src].skipped++;
                            });
                            const subjects = Object.entries(subjectMap);
                            if (subjects.length === 0) return null;
                            return (
                                <>
                                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Subject-wise Breakdown</Text>
                                    <View style={styles.infoCard}>
                                        {subjects.map(([subj, st], i) => (
                                            <View key={subj}>
                                                {i > 0 && <View style={styles.divider} />}
                                                <View style={styles.subjectRow}>
                                                    <Text style={styles.subjectName}>{subj}</Text>
                                                    <View style={styles.subjectStats}>
                                                        <Text style={[styles.subjectStat, { color: COLORS.correct }]}>✓{st.correct}</Text>
                                                        <Text style={[styles.subjectStat, { color: COLORS.wrong }]}>✗{st.wrong}</Text>
                                                        <Text style={[styles.subjectStat, { color: COLORS.skipped }]}>—{st.skipped}</Text>
                                                        <Text style={[styles.subjectStat, { color: COLORS.muted }]}>{st.total}Q</Text>
                                                    </View>
                                                </View>
                                                {/* Mini progress bar */}
                                                <View style={styles.progressBarBg}>
                                                    <View style={[styles.progressBarFill, {
                                                        width: `${(st.correct / st.total) * 100}%`,
                                                        backgroundColor: COLORS.correct,
                                                    }]} />
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                )}

                {/* Review Tab */}
                {activeTab === 'review' && (
                    <View style={styles.content}>
                        <Text style={styles.sectionTitle}>
                            Question Review ({questions?.length || 0})
                        </Text>
                        {/* Filter summary */}
                        <View style={styles.filterRow}>
                            <View style={[styles.filterChip, { backgroundColor: COLORS.correct + '20' }]}>
                                <Text style={{ color: COLORS.correct, fontSize: 12, fontWeight: '600' }}>✓ {correct ?? 0} Correct</Text>
                            </View>
                            <View style={[styles.filterChip, { backgroundColor: COLORS.wrong + '20' }]}>
                                <Text style={{ color: COLORS.wrong, fontSize: 12, fontWeight: '600' }}>✗ {wrong ?? 0} Wrong</Text>
                            </View>
                            <View style={[styles.filterChip, { backgroundColor: COLORS.skipped + '20' }]}>
                                <Text style={{ color: COLORS.skipped, fontSize: 12, fontWeight: '600' }}>— {unattempted ?? 0} Skipped</Text>
                            </View>
                        </View>
                        {questions?.map((item, index) => (
                            <QuestionCard key={item.question_id || index} item={item} index={index} />
                        ))}
                    </View>
                )}

            </ScrollView>

            {/* Bottom Buttons */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
                    <Text style={styles.homeBtnText}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.retryBtnFull} onPress={() => navigation.goBack()}>
                    <Text style={styles.retryBtnText}>Retry Test</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
    loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 15 },

    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
    testTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    dateText: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

    scoreCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        margin: 16,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 5,
    },
    scoreRingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    circle: {
        borderWidth: 12,
        position: 'absolute',
    },
    scoreCenter: { alignItems: 'center' },
    scoreText: { fontSize: 28, fontWeight: '900', color: COLORS.text },
    scoreTotal: { fontSize: 13, color: COLORS.muted },
    percentage: { fontSize: 16, fontWeight: '700', marginTop: 2 },

    scoreInfo: { marginLeft: 20, flex: 1 },
    percentageBig: { fontSize: 38, fontWeight: '900', color: COLORS.text },
    scoreLabel: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    remarkBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    remarkText: { fontWeight: '700', fontSize: 13 },
    rankText: { marginTop: 6, color: COLORS.gold, fontWeight: '700', fontSize: 14 },
    percentileText: { marginTop: 4, color: COLORS.muted, fontSize: 13 },

    statsContainer: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
    statPill: {
        flex: 1, backgroundColor: COLORS.surface,
        paddingVertical: 14, borderRadius: 16,
        alignItems: 'center', borderWidth: 1,
    },
    statValue: { fontSize: 24, fontWeight: '800' },
    statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },

    tabs: {
        flexDirection: 'row', marginHorizontal: 16,
        backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: '#fff', elevation: 3 },
    tabText: { fontSize: 15, fontWeight: '600', color: COLORS.muted },
    tabTextActive: { color: COLORS.text },

    content: { paddingHorizontal: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginVertical: 16 },

    infoCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        marginBottom: 8,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    infoLabel: { fontSize: 14, color: COLORS.muted },
    infoValue: { fontSize: 15, fontWeight: '700', color: COLORS.text },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },

    subjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 13, paddingBottom: 6 },
    subjectName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
    subjectStats: { flexDirection: 'row', gap: 10 },
    subjectStat: { fontSize: 13, fontWeight: '700' },
    progressBarBg: { height: 5, backgroundColor: COLORS.border, marginHorizontal: 16, marginBottom: 13, borderRadius: 3 },
    progressBarFill: { height: 5, borderRadius: 3 },

    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },

    qCard: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    qTopStrip: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderLeftWidth: 4,
    },
    qHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },
    statusBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    marksContainer: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
    marksText: { fontSize: 13, fontWeight: '700' },
    qIndex: { fontSize: 12, color: COLORS.muted, marginBottom: 5, fontWeight: '600' },
    qText: { fontSize: 15.5, lineHeight: 22, color: COLORS.text },

    qExpanded: { padding: 16, paddingTop: 4, backgroundColor: COLORS.surface },

    option: {
        padding: 14, borderRadius: 12,
        backgroundColor: '#F8FAFC',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    optionCorrect: { backgroundColor: '#F0FDF4', borderColor: COLORS.correct },
    optionWrong: { backgroundColor: '#FEF2F2', borderColor: COLORS.wrong },
    optionRow: { flexDirection: 'row', alignItems: 'center' },
    optionBullet: {
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        marginRight: 10,
    },
    optionText: { fontSize: 15, lineHeight: 21, flex: 1 },

    correctAnswerNote: {
        backgroundColor: '#F0FDF4',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.correct + '50',
    },

    explanationBox: {
        backgroundColor: COLORS.accentSoft,
        padding: 16, borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accent,
        marginTop: 4,
    },
    explanationTitle: { fontWeight: '700', color: COLORS.accent, marginBottom: 6, fontSize: 14 },
    explanationText: { color: COLORS.text, lineHeight: 20, fontSize: 14 },

    bottomBar: {
        flexDirection: 'row', padding: 16,
        backgroundColor: COLORS.card,
        paddingBottom:50,
        borderTopWidth: 1, borderTopColor: COLORS.border, gap: 12,
    },
    homeBtn: {
        flex: 1, paddingVertical: 15, borderRadius: 14,
        backgroundColor: '#F1F5F9', alignItems: 'center',
    },
    homeBtnText: { fontWeight: '700', color: COLORS.muted, fontSize: 16 },
    retryBtnFull: {
        flex: 1, paddingVertical: 15, borderRadius: 14,
        backgroundColor: COLORS.accent, alignItems: 'center',
    },
    retryBtnText: { fontWeight: '700', color: '#fff', fontSize: 16 },
});