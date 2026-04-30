import React, { useEffect, useState, useRef, useCallback } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    FlatList,
    BackHandler,
    StyleSheet,
    ScrollView,
    StatusBar,
    SafeAreaView,
} from 'react-native'
import api from '../../utils/axios'

// ─── RESULT SCREEN ────────────────────────────────────────────────────────────
function ResultScreen({ result, onCheckFull }) {
    const total = (result.correct || 0) + (result.wrong || 0) + (result.unattempted || 0)
    const pct = total ? Math.round(((result.correct || 0) / total) * 100) : 0

    return (
        <SafeAreaView style={rs.root}>
            <StatusBar barStyle="light-content" backgroundColor="#B91C1C" />
            <View style={rs.header}>
                <Text style={rs.headerTitle}>Test Completed</Text>
            </View>

            <ScrollView contentContainerStyle={rs.body}>
                {/* Score ring */}
                <View style={rs.scoreCard}>
                    <View style={rs.ring}>
                        <Text style={rs.ringPct}>{pct}%</Text>
                        <Text style={rs.ringLabel}>Score</Text>
                    </View>
                </View>

                {/* Stats grid */}
                <View style={rs.grid}>
                    <StatBox label="Correct" value={result.correct ?? 0} color="#16A34A" />
                    <StatBox label="Wrong" value={result.wrong ?? 0} color="#B91C1C" />
                    <StatBox label="Skipped" value={result.unattempted ?? 0} color="#6B7280" />
                    <StatBox label="Score" value={result.score ?? 0} color="#1D4ED8" />
                </View>

                <TouchableOpacity style={rs.btn} onPress={onCheckFull}>
                    <Text style={rs.btnText}>Check Full Result</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    )
}

function StatBox({ label, value, color }) {
    return (
        <View style={[rs.statBox, { borderTopColor: color }]}>
            <Text style={[rs.statValue, { color }]}>{value}</Text>
            <Text style={rs.statLabel}>{label}</Text>
        </View>
    )
}

const rs = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFF5F5' },
    header: {
        backgroundColor: '#B91C1C',
        paddingVertical: 18,
        paddingHorizontal: 20,
    },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
    body: { padding: 20, alignItems: 'center' },
    scoreCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 30,
        marginBottom: 24,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    ring: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        borderColor: '#B91C1C',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ringPct: { fontSize: 28, fontWeight: '800', color: '#B91C1C' },
    ringLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 32,
        width: '100%',
    },
    statBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderTopWidth: 4,
        padding: 16,
        width: '45%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: { fontSize: 28, fontWeight: '800' },
    statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
    btn: {
        backgroundColor: '#B91C1C',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 40,
        width: '100%',
        alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StartTestPrelims({ route, navigation }) {
    const { testId } = route.params

    const [questions, setQuestions] = useState([])
    const [current, setCurrent] = useState(0)
    const [answers, setAnswers] = useState({})
    const [timer, setTimer] = useState(0)
    const [attemptId, setAttemptId] = useState(null)
    const [loading, setLoading] = useState(true)
    const [result, setResult] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    const autosaveRef = useRef(null)
    const answersRef = useRef({})
    const attemptIdRef = useRef(null)

    // keep refs in sync
    useEffect(() => { answersRef.current = answers }, [answers])
    useEffect(() => { attemptIdRef.current = attemptId }, [attemptId])

    // ── back-press guard ────────────────────────────────────────────────────────
    useEffect(() => {
        const onBack = () => {
            Alert.alert(
                'Leave Test?',
                'Your progress will be saved. You can resume this test later.',
                [
                    { text: 'Stay', style: 'cancel' },
                    {
                        text: 'Leave', style: 'destructive',
                        onPress: () => navigation.goBack()
                    }
                ]
            )
            return true // block default back
        }
        const sub = BackHandler.addEventListener('hardwareBackPress', onBack)
        return () => sub.remove()
    }, [navigation])

    // ── start test ──────────────────────────────────────────────────────────────
    const startTest = async () => {
        try {
            const res = await api.post(`/new/tests/${testId}/start`)
            const data = res.data.data
            setAttemptId(data.attempt_id)
            setTimer(data.remaining_seconds)
            setQuestions(data.questions || [])
            if (data.saved_answers?.length) {
                const map = {}
                data.saved_answers.forEach(a => { map[a.question_id] = a.selected_option })
                setAnswers(map)
            }
        } catch {
            Alert.alert('Error', 'Failed to start test')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { startTest() }, [])

    // ── timer ───────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!timer) return
        const id = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) { clearInterval(id); handleSubmit(true); return 0 }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(id)
    }, [timer])

    // ── autosave ────────────────────────────────────────────────────────────────
    const autoSave = (updated) => {
        if (!attemptIdRef.current) return
        if (autosaveRef.current) clearTimeout(autosaveRef.current)
        autosaveRef.current = setTimeout(() => {
            api.post(`/new/tests/${testId}/autosave`, {
                attempt_id: attemptIdRef.current,
                answers: Object.keys(updated).map(q => ({
                    question_id: q,
                    selected_option: updated[q]
                }))
            }).catch(() => { })
        }, 800)
    }

    // ── select option ───────────────────────────────────────────────────────────
    const selectOption = (qid, option) => {
        const updated = { ...answersRef.current, [qid]: option }
        setAnswers(updated)
        autoSave(updated)
    }

    // ── submit ──────────────────────────────────────────────────────────────────
    const submitFinal = async () => {
        setSubmitting(true)
        try {
            const formatted = Object.keys(answersRef.current).map(q => ({
                question_id: q,
                selected_option: answersRef.current[q]
            }))
            const res = await api.post(`/new/tests/${testId}/submit`, {
                attempt_id: attemptIdRef.current,
                answers: formatted
            })
            console.log(res.data)
            setResult(res.data.data)
        } catch {
            Alert.alert('Error', 'Submit failed. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = (auto = false) => {
        if (auto) { submitFinal(); return }
        Alert.alert(
            'Submit Test',
            'Are you sure you want to submit?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', style: 'destructive', onPress: submitFinal }
            ]
        )
    }

    // ── helpers ─────────────────────────────────────────────────────────────────
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60)
        const s = sec % 60
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }

    const isLow = timer < 300
    const answered = Object.keys(answers).length
    const q = questions[current]

    // ── result screen ───────────────────────────────────────────────────────────
    if (result) {
        return (
            <ResultScreen
                result={result}
                onCheckFull={() => navigation.replace('NewResultScreen', { attemptId, result })}
            />
        )
    }

    if (loading) {
        return (
            <View style={s.center}>
                <ActivityIndicator size="large" color="#B91C1C" />
                <Text style={s.loadingText}>Loading test…</Text>
            </View>
        )
    }

    return (
        <SafeAreaView style={s.root}>

            {/* ── HEADER ── */}
            <View style={s.header}>
                <View>
                    <Text style={s.headerSmall}>Question {current + 1}/{questions.length}</Text>
                    <Text style={s.headerSub}>{answered} answered</Text>
                </View>
                <View style={[s.timerBox, isLow && s.timerLow]}>
                    <Text style={s.timerIcon}>⏱</Text>
                    <Text style={[s.timerText, isLow && s.timerTextLow]}>{formatTime(timer)}</Text>
                </View>
            </View>

            <ScrollView style={s.body} showsVerticalScrollIndicator={false}>

                {/* ── QUESTION ── */}
                <View style={s.questionCard}>
                    <View style={s.qBadge}>
                        <Text style={s.qBadgeText}>Q{current + 1}</Text>
                    </View>
                    <Text style={s.questionText}>{q?.question_text}</Text>
                </View>

                {/* ── OPTIONS ── */}
                {q?.options?.map((opt) => {
                    const selected = answers[q.id] === opt.option_number
                    return (
                        <TouchableOpacity
                            key={opt.id}
                            onPress={() => selectOption(q.id, opt.option_number)}
                            activeOpacity={0.75}
                            style={[s.option, selected && s.optionSelected]}
                        >
                            <View style={[s.optionBullet, selected && s.optionBulletSelected]}>
                                <Text style={[s.optionBulletText, selected && { color: '#fff' }]}>
                                    {opt.option_number}
                                </Text>
                            </View>
                            <Text style={[s.optionText, selected && s.optionTextSelected]}>
                                {opt.option_text}
                            </Text>
                        </TouchableOpacity>
                    )
                })}

                {/* ── QUESTION PALETTE ── */}
                <Text style={s.paletteTitle}>Question Palette</Text>
                <View style={s.legendRow}>
                    <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: '#16A34A' }]} />
                        <Text style={s.legendLabel}>Answered</Text>
                    </View>
                    <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: '#E5E7EB' }]} />
                        <Text style={s.legendLabel}>Not Answered</Text>
                    </View>
                    <View style={s.legendItem}>
                        <View style={[s.legendDot, { backgroundColor: '#B91C1C' }]} />
                        <Text style={s.legendLabel}>Current</Text>
                    </View>
                </View>
                <FlatList
                    data={questions}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={6}
                    scrollEnabled={false}
                    renderItem={({ item, index }) => {
                        const isAnswered = !!answers[item.id]
                        const isCurrent = index === current
                        const bg = isCurrent ? '#B91C1C' : isAnswered ? '#16A34A' : '#E5E7EB'
                        const txtColor = (isCurrent || isAnswered) ? '#fff' : '#374151'
                        return (
                            <TouchableOpacity
                                onPress={() => setCurrent(index)}
                                style={[s.paletteDot, { backgroundColor: bg }]}
                            >
                                <Text style={[s.paletteDotText, { color: txtColor }]}>{index + 1}</Text>
                            </TouchableOpacity>
                        )
                    }}
                />

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── FOOTER NAV ── */}
            <View style={s.footer}>
                <TouchableOpacity
                    disabled={current === 0}
                    onPress={() => setCurrent(p => p - 1)}
                    style={[s.navBtn, current === 0 && s.navBtnDisabled]}
                >
                    <Text style={[s.navBtnText, current === 0 && s.navBtnTextDisabled]}> Prev</Text>
                </TouchableOpacity>

                {current === questions.length - 1 ? (
                    <TouchableOpacity
                        style={s.submitBtn}
                        onPress={() => handleSubmit()}
                        disabled={submitting}
                    >
                        {submitting
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={s.submitBtnText}>Submit Test</Text>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={s.navBtnNext}
                        onPress={() => setCurrent(p => p + 1)}
                    >
                        <Text style={s.navBtnNextText}>Next </Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#FFF5F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F5' },
    loadingText: { marginTop: 12, color: '#6B7280', fontSize: 14 },

    // header
    header: {
        backgroundColor: '#B91C1C',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 14,
    },
    headerSmall: { color: '#fff', fontSize: 16, fontWeight: '700' },
    headerSub: { color: '#FCA5A5', fontSize: 12, marginTop: 2 },
    timerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    timerLow: { backgroundColor: '#fff' },
    timerIcon: { fontSize: 14 },
    timerText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    timerTextLow: { color: '#B91C1C' },

    // body
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    // question card
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    qBadge: {
        backgroundColor: '#FEE2E2',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 10,
    },
    qBadgeText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
    questionText: { color: '#111827', fontSize: 15, lineHeight: 24 },

    // options
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        padding: 14,
        marginBottom: 10,
        gap: 12,
    },
    optionSelected: {
        borderColor: '#B91C1C',
        backgroundColor: '#FFF1F1',
    },
    optionBullet: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    optionBulletSelected: {
        backgroundColor: '#B91C1C',
        borderColor: '#B91C1C',
    },
    optionBulletText: { fontSize: 13, fontWeight: '700', color: '#374151' },
    optionText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 22 },
    optionTextSelected: { color: '#B91C1C', fontWeight: '600' },

    // palette
    paletteTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginTop: 20,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    legendRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 3 },
    legendLabel: { fontSize: 11, color: '#6B7280' },
    paletteDot: {
        width: 40,
        height: 40,
        margin: 4,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    paletteDotText: { fontSize: 12, fontWeight: '700' },

    // footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 58,

        paddingVertical: 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 4,
    },
    navBtn: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#B91C1C',
    },
    navBtnDisabled: { borderColor: '#E5E7EB' },
    navBtnText: { color: '#B91C1C', fontWeight: '700', fontSize: 14 },
    navBtnTextDisabled: { color: '#D1D5DB' },
    navBtnNext: {
        backgroundColor: '#B91C1C',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 10,
    },
    navBtnNextText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    submitBtn: {
        backgroundColor: '#B91C1C',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 10,
        minWidth: 130,
        alignItems: 'center',
    },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})