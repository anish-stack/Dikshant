import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
} from 'react-native'
import React, { useEffect, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import api from '../../utils/axios'

export default function NewTestScreen({ route, navigation }) {
    const { testId } = route.params || {}

    const [test, setTest] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchTest = async () => {
        try {
            const res = await api.get(`/new/tests/${testId}`)
            setTest(res.data?.data?.test)
        } catch (err) {
            console.log(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTest() }, [])

    const handleStartTest = () => {
        navigation.navigate('StartTestPrelims', {
            testId,
            resume: test?.resume_attempt,
        })
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color="#DC2626" />
            </SafeAreaView>
        )
    }

    if (!test) return null

    const resumeMinutes = test.resume_attempt
        ? Math.floor(test.resume_attempt.remaining_seconds / 60)
        : null

    const btnLabel = !test.has_access
        ? 'Buy Now'
        : test.resume_attempt
            ? 'Resume Test'
            : test.can_attempt
                ? 'Start Test'
                : 'Attempt Limit Reached'

    const btnDisabled = !test.can_attempt && test.has_access

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />



            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

                {/* Title card */}
                <View style={styles.titleCard}>
                    <View style={styles.titleBadge}>
                        <Text style={styles.titleBadgeText}>PRELIMS</Text>
                    </View>
                    <Text style={styles.testTitle}>{test.title}</Text>
                    {test.resume_attempt && (
                        <View style={styles.resumeBanner}>
                            <Feather name="clock" size={13} color="#D97706" />
                            <Text style={styles.resumeText}>
                                Resume available — {resumeMinutes} min remaining
                            </Text>
                        </View>
                    )}
                </View>

                {/* Stats grid */}
                <View style={styles.statsGrid}>
                    {[
                        { icon: 'clock', label: 'Duration', value: `${test.duration_minutes} min` },
                        { icon: 'star', label: 'Total Marks', value: test.total_marks },
                        { icon: 'minus-circle', label: 'Negative', value: test.negative_marking ?? 'N/A' },
                        { icon: 'repeat', label: 'Attempts', value: `${test.attempt_count} / ${test.max_attempts}` },
                    ].map((item, i) => (
                        <View key={i} style={styles.statCard}>
                            <Feather name={item.icon} size={18} color="#DC2626" />
                            <Text style={styles.statValue}>{item.value}</Text>
                            <Text style={styles.statLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Instructions */}
                {test.instructions ? (
                    <View style={styles.instructionsCard}>
                        <View style={styles.instructionsHeader}>
                            <Feather name="info" size={14} color="#DC2626" />
                            <Text style={styles.instructionsTitle}>Instructions</Text>
                        </View>
                        <Text style={styles.instructionsText}>{test.instructions}</Text>
                    </View>
                ) : null}

                

            </ScrollView>

             <View style={styles.ctaBar}>
    <TouchableOpacity
      onPress={handleStartTest}
      disabled={btnDisabled}
      style={[styles.ctaBtn, btnDisabled && styles.ctaBtnDisabled]}
      activeOpacity={0.85}
    >
      <Feather
        name={test.resume_attempt ? 'play' : 'arrow-right-circle'}
        size={18}
        color="#fff"
      />
      <Text style={styles.ctaBtnText}>{btnLabel}</Text>
    </TouchableOpacity>
  </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

   
    scroll: { padding: 16, paddingBottom: 40 },

    // Title card
    titleCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    titleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#EFF6FF',
        borderWidth: 1,
        borderColor: '#BFDBFE',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 10,
    },
    titleBadgeText: { fontSize: 10, fontWeight: '800', color: '#1D4ED8', letterSpacing: 1 },
    testTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', lineHeight: 24 },

    resumeBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: '#FDE68A',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    resumeText: { fontSize: 12, color: '#D97706', fontWeight: '600' },

    // Stats
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 14,
    },
    statCard: {
        width: '47.5%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 5,
    },
    statValue: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
    statLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },

    // Instructions
    instructionsCard: {
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    instructionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        marginBottom: 10,
    },
    instructionsTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
    instructionsText: { fontSize: 13, color: '#475569', lineHeight: 21 },

    // CTA
   ctaBar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#E2E8F0',
  paddingHorizontal: 16,
  paddingTop: 10,
  paddingBottom: 50,
},

ctaBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#DC2626',
  paddingVertical: 15,
  borderRadius: 12,
},
    ctaBtnDisabled: { backgroundColor: '#CBD5E1' },
    ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})