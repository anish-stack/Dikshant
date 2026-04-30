import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity,
    ActivityIndicator, StyleSheet, Alert, Linking, Modal,
} from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../utils/axios';

const COLORS = {
    background: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
    text: '#1E2937', muted: '#64748B', accent: '#DC2626',
    success: '#16A34A', warning: '#CA8A04', disabled: '#94A3B8', purple: '#8B5CF6',
};

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};
const formatBytes = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ── Small reusable components ─────────────────────────────────────────────────
const InfoChip = ({ icon, value, label }) => (
    <View style={styles.infoItem}>
        {icon}
        <Text style={styles.infoValue}>{value ?? '—'}</Text>
        <Text style={styles.infoLabel}>{label}</Text>
    </View>
);
const FlagBadge = ({ label, color, bgColor, icon }) => (
    <View style={[styles.flagBadge, { backgroundColor: bgColor }]}>
        {icon}
        <Text style={[styles.flagText, { color }]}>{label}</Text>
    </View>
);
const SectionHeader = ({ title }) => <Text style={styles.sectionTitle}>{title}</Text>;
const InfoRow = ({ label, value, valueColor }) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueColor && { color: valueColor }]}>{value ?? '—'}</Text>
    </View>
);
const Divider = () => <View style={styles.divider} />;
const ResourceRow = ({ icon, title, desc, onPress, disabled, rightIcon, borderColor }) => (
    <TouchableOpacity
        style={[styles.resourceCard, borderColor && { borderColor, borderWidth: 1.5 }, disabled && styles.disabledCard]}
        onPress={onPress} disabled={disabled} activeOpacity={0.7}
    >
        <View style={styles.iconBox}>{icon}</View>
        <View style={styles.resourceInfo}>
            <Text style={[styles.resourceTitle, disabled && { color: COLORS.disabled }]}>{title}</Text>
            <Text style={styles.resourceDesc}>{desc}</Text>
        </View>
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
    </TouchableOpacity>
);

// ── Countdown ─────────────────────────────────────────────────────────────────
const CountdownTimer = ({ endAt }) => {
    const [display, setDisplay] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = new Date(endAt).getTime() - Date.now();
            if (diff <= 0) { setDisplay('Test Ended'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setDisplay(`${h}h ${m}m ${s}s`);
        };
        calc();
        const t = setInterval(calc, 1000);
        return () => clearInterval(t);
    }, [endAt]);
    return (
        <View style={styles.timerBox}>
            <Feather name="clock" size={18} color={COLORS.accent} />
            <Text style={styles.timerLabel}>Time Remaining</Text>
            <Text style={styles.timerValue}>{display}</Text>
        </View>
    );
};

// ── Upload Section ────────────────────────────────────────────────────────────
const UploadSection = ({ paperId, canUpload, hasSubmitted, submission, onSubmitSuccess }) => {
    const [pickedFile, setPickedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset) return;
            if (asset.size && asset.size > 20 * 1024 * 1024) { Alert.alert('File Too Large', 'PDF must be under 20MB.'); return; }
            setPickedFile(asset);
        } catch { Alert.alert('Error', 'Failed to pick file'); }
    };

    const handleSubmit = async () => {
        if (!pickedFile) { Alert.alert('No File', 'Please pick a PDF first.'); return; }
        Alert.alert('Confirm Submission', `Submit "${pickedFile.name}"?\n\nThis cannot be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Submit', style: 'destructive', onPress: async () => {
                    try {
                        setUploading(true); setUploadProgress(0);
                        const formData = new FormData();
                        formData.append('file', { uri: pickedFile.uri, name: pickedFile.name, type: 'application/pdf' });
                        await api.post(`/new/mains/submit/${paperId}`, formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
                        });
                        setPickedFile(null);
                        Alert.alert('✅ Submitted', 'Answer sheet uploaded successfully!');
                        onSubmitSuccess();
                    } catch (err) {
                        Alert.alert('Upload Failed', err?.response?.data?.message || 'Upload failed. Try again.');
                    } finally { setUploading(false); setUploadProgress(0); }
                }
            }
        ]);
    };

    if (hasSubmitted && submission) {
        return (
            <View style={styles.uploadCard}>
                <View style={styles.uploadCardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: COLORS.success + '15' }]}>
                        <Feather name="check-circle" size={26} color={COLORS.success} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.resourceTitle, { color: COLORS.success }]}>Answer Sheet Submitted ✓</Text>
                        <Text style={styles.resourceDesc}>Submitted {formatDate(submission.submitted_at)}</Text>
                    </View>
                </View>
                {(submission.answer_pdf_url || submission.file_url) && (
                    <TouchableOpacity style={styles.viewFileBtn} onPress={() => Linking.openURL(submission.answer_pdf_url || submission.file_url)}>
                        <Feather name="eye" size={16} color={COLORS.accent} />
                        <Text style={styles.viewFileBtnText}>View Submitted File</Text>
                        <Feather name="external-link" size={14} color={COLORS.accent} />
                    </TouchableOpacity>
                )}
            </View>
        );
    }
    if (!canUpload) {
        return (
            <View style={[styles.uploadCard, styles.disabledCard]}>
                <View style={styles.uploadCardHeader}>
                    <View style={styles.iconBox}><Feather name="upload" size={26} color={COLORS.disabled} /></View>
                    <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text style={[styles.resourceTitle, { color: COLORS.disabled }]}>Upload Answer Sheet</Text>
                        <Text style={styles.resourceDesc}>Upload window is closed</Text>
                    </View>
                    <Feather name="lock" size={18} color={COLORS.disabled} />
                </View>
            </View>
        );
    }
    return (
        <View style={[styles.uploadCard, { borderColor: COLORS.accent, borderWidth: 1.5 }]}>
            <View style={styles.uploadCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                    <Feather name="upload" size={26} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.resourceTitle}>Upload Answer Sheet</Text>
                    <Text style={styles.resourceDesc}>PDF only · Max 20MB</Text>
                </View>
            </View>
            {pickedFile ? (
                <View style={styles.pickedFileBox}>
                    <Feather name="file-text" size={20} color={COLORS.accent} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.pickedFileName} numberOfLines={1}>{pickedFile.name}</Text>
                        <Text style={styles.pickedFileMeta}>{formatBytes(pickedFile.size)} · PDF</Text>
                    </View>
                    <TouchableOpacity onPress={() => setPickedFile(null)} style={styles.removeFileBtn}>
                        <Feather name="x" size={18} color={COLORS.muted} />
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={uploading}>
                    <Feather name="folder" size={18} color={COLORS.accent} />
                    <Text style={styles.pickBtnText}>Choose PDF File</Text>
                </TouchableOpacity>
            )}
            {uploading && (
                <View style={styles.progressWrap}>
                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{uploadProgress}%</Text>
                </View>
            )}
            <TouchableOpacity
                style={[styles.submitBtn, (!pickedFile || uploading) && styles.submitBtnDisabled]}
                onPress={handleSubmit} disabled={!pickedFile || uploading}
            >
                {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="send" size={16} color="#fff" />}
                <Text style={styles.submitBtnText}>{uploading ? `Uploading... ${uploadProgress}%` : 'Submit Answer Sheet'}</Text>
            </TouchableOpacity>
        </View>
    );
};

// ── Result Modal ──────────────────────────────────────────────────────────────
const ResultModal = ({ visible, onClose, submission, totalMarks, paperTitle }) => {
    if (!submission) return null;

    const marks = parseFloat(submission.marks_obtained || 0);
    const total = parseFloat(totalMarks || 0);
    const pct = total > 0 ? ((marks / total) * 100).toFixed(1) : 0;
    const isPassed = submission.result_status === 'pass';
    const isChecked = submission.status === 'checked';

    const scoreColor = pct >= 60 ? COLORS.success : pct >= 40 ? COLORS.warning : COLORS.accent;

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                    {/* Handle */}
                    <View style={styles.modalHandle} />

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle}>Evaluation Result</Text>
                            <Text style={styles.modalSubtitle} numberOfLines={1}>{paperTitle}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                            <Feather name="x" size={22} color={COLORS.muted} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>

                        {/* Score Ring Area */}
                        <View style={styles.scoreHero}>
                            <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
                                <Text style={[styles.scoreMarks, { color: scoreColor }]}>{marks.toFixed(0)}</Text>
                                <Text style={styles.scoreDivider}>/ {total.toFixed(0)}</Text>
                                <Text style={[styles.scorePct, { color: scoreColor }]}>{pct}%</Text>
                            </View>

                            <View style={styles.scoreRight}>
                                {/* Pass/Fail Badge */}
                                <View style={[styles.resultBadgeLarge, {
                                    backgroundColor: isPassed ? COLORS.success + '18' : COLORS.accent + '18',
                                }]}>
                                    <Feather
                                        name={isPassed ? 'award' : 'x-circle'}
                                        size={18}
                                        color={isPassed ? COLORS.success : COLORS.accent}
                                    />
                                    <Text style={[styles.resultBadgeLargeText, {
                                        color: isPassed ? COLORS.success : COLORS.accent,
                                    }]}>
                                        {isPassed ? 'PASSED' : 'FAILED'}
                                    </Text>
                                </View>

                                {/* Status Badge */}
                                <View style={[styles.statusBadge, {
                                    backgroundColor: isChecked ? COLORS.success + '12' : COLORS.warning + '18',
                                }]}>
                                    <Feather
                                        name={isChecked ? 'check-circle' : 'clock'}
                                        size={13}
                                        color={isChecked ? COLORS.success : COLORS.warning}
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text style={[styles.statusBadgeText, {
                                        color: isChecked ? COLORS.success : COLORS.warning,
                                    }]}>
                                        {isChecked ? 'Checked' : submission.status}
                                    </Text>
                                </View>

                                <Text style={styles.scoreLabel}>Marks Obtained</Text>
                                <Text style={[styles.scoreMarksBig, { color: scoreColor }]}>
                                    {marks.toFixed(2)}
                                </Text>
                                <Text style={styles.scoreTotalLabel}>out of {total}</Text>
                            </View>
                        </View>

                        {/* Detail Card */}
                        <View style={[styles.detailCard, { marginHorizontal: 16 }]}>
                            <InfoRow label="Submitted At" value={formatDate(submission.submitted_at)} />
                            <Divider />
                            <InfoRow label="Marks Obtained" value={`${marks.toFixed(2)} / ${total}`} valueColor={scoreColor} />
                            <Divider />
                            <InfoRow label="Percentage" value={`${pct}%`} valueColor={scoreColor} />
                            <Divider />
                            <InfoRow
                                label="Result"
                                value={isPassed ? 'Pass ✓' : 'Fail ✗'}
                                valueColor={isPassed ? COLORS.success : COLORS.accent}
                            />
                            <Divider />
                            <InfoRow
                                label="Evaluation Status"
                                value={isChecked ? 'Checked ✓' : submission.status}
                                valueColor={isChecked ? COLORS.success : COLORS.warning}
                            />
                        </View>

                        {/* PDF Buttons */}
                        <View style={styles.pdfButtonsWrap}>
                            {submission.answer_pdf_url && (
                                <TouchableOpacity
                                    style={[styles.pdfBtn, { borderColor: COLORS.accent }]}
                                    onPress={() => Linking.openURL(submission.answer_pdf_url)}
                                >
                                    <Feather name="file-text" size={18} color={COLORS.accent} />
                                    <Text style={[styles.pdfBtnText, { color: COLORS.accent }]}>Your Answer Sheet</Text>
                                    <Feather name="external-link" size={14} color={COLORS.accent} />
                                </TouchableOpacity>
                            )}
                            {submission.evaluated_pdf_url && (
                                <TouchableOpacity
                                    style={[styles.pdfBtn, { borderColor: COLORS.success }]}
                                    onPress={() => Linking.openURL(submission.evaluated_pdf_url)}
                                >
                                    <MaterialIcons name="assignment-turned-in" size={18} color={COLORS.success} />
                                    <Text style={[styles.pdfBtnText, { color: COLORS.success }]}>Evaluated Copy</Text>
                                    <Feather name="external-link" size={14} color={COLORS.success} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Close Button */}
                        <TouchableOpacity style={styles.modalCloseFullBtn} onPress={onClose}>
                            <Text style={styles.modalCloseFullBtnText}>Close</Text>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function QuestionListScreen({ route, navigation }) {
    const { testId } = route.params || {};
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [instrExpanded, setInstrExpanded] = useState(false);
    const [resultModalVisible, setResultModalVisible] = useState(false);

    useEffect(() => { if (testId) fetchTestDetails(); }, [testId]);

    const fetchTestDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/new/mains-test/${testId}`);
            setData(res.data.data);
        } catch { Alert.alert('Error', 'Failed to load test details'); }
        finally { setLoading(false); }
    };

    const openPDF = async (url, title) => {
        if (!url) { Alert.alert('Not Available', `${title} not available yet.`); return; }
        try { await Linking.openURL(url); }
        catch { Alert.alert('Error', 'Unable to open file'); }
    };

    if (loading) return (
        <SafeAreaView style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading Mains Test...</Text>
        </SafeAreaView>
    );

    if (!data) return (
        <SafeAreaView style={styles.center}>
            <Text style={{ color: COLORS.accent, fontSize: 16 }}>Failed to load test</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchTestDetails}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );

    const {
        paper_title, duration_minutes, total_marks, total_questions,
        question_pdf_url, model_answer_pdf_url, sample_copy_pdf_url,
        flags, start_at, end_at, instructions, submission_type,
        time_left_minutes, submission, paper_id,
    } = data;

    const {
        can_download_paper, can_upload_answer, can_view_result,
        has_submitted, is_closed, is_live, is_published, is_result_declared,
    } = flags;

    const now = Date.now();
    const startMs = start_at ? new Date(start_at).getTime() : null;
    const endMs = end_at ? new Date(end_at).getTime() : null;
    let testStatus = 'Upcoming', testStatusColor = COLORS.warning;
    if (is_live) { testStatus = 'Live Now'; testStatusColor = COLORS.accent; }
    else if (is_closed || (endMs && now > endMs)) { testStatus = 'Closed'; testStatusColor = COLORS.disabled; }
    else if (is_published && startMs && now < startMs) { testStatus = 'Scheduled'; testStatusColor = COLORS.purple; }
    else if (is_published) { testStatus = 'Published'; testStatusColor = COLORS.success; }

    return (
        <SafeAreaView style={styles.root}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>Mains Test</Text>
                <View style={[styles.statusChip, { backgroundColor: testStatusColor + '20' }]}>
                    <Text style={[styles.statusChipText, { color: testStatusColor }]}>{testStatus}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Main Card */}
                <View style={styles.mainCard}>
                    <Text style={styles.testTitle}>{paper_title}</Text>
                    <View style={styles.infoGrid}>
                        <InfoChip icon={<Feather name="clock" size={20} color={COLORS.muted} />} value={duration_minutes ? `${duration_minutes}m` : '—'} label="Duration" />
                        <View style={styles.infoSep} />
                        <InfoChip icon={<MaterialIcons name="stars" size={20} color={COLORS.muted} />} value={total_marks} label="Marks" />
                        <View style={styles.infoSep} />
                        <InfoChip icon={<Feather name="help-circle" size={20} color={COLORS.muted} />} value={total_questions ?? 'N/A'} label="Questions" />
                        <View style={styles.infoSep} />
                        <InfoChip icon={<Feather name="file" size={20} color={COLORS.muted} />} value={submission_type?.toUpperCase() ?? '—'} label="Submit As" />
                    </View>
                    {is_live && end_at && <CountdownTimer endAt={end_at} />}
                    {!is_live && time_left_minutes != null && (
                        <View style={[styles.timerBox, { backgroundColor: '#F0FDF4' }]}>
                            <Feather name="clock" size={16} color={COLORS.success} />
                            <Text style={[styles.timerLabel, { color: COLORS.success }]}>Time Left</Text>
                            <Text style={[styles.timerValue, { color: COLORS.success }]}>{time_left_minutes} min</Text>
                        </View>
                    )}
                </View>

                {/* Flags */}
                <View style={styles.flagsRow}>
                    {is_live && <FlagBadge label="LIVE" color="#fff" bgColor={COLORS.accent} icon={<Feather name="zap" size={13} color="#fff" style={{ marginRight: 4 }} />} />}
                    {is_published && !is_live && <FlagBadge label="Published" color={COLORS.success} bgColor={COLORS.success + '18'} icon={<Feather name="check" size={13} color={COLORS.success} style={{ marginRight: 4 }} />} />}
                    {is_closed && <FlagBadge label="Closed" color={COLORS.disabled} bgColor="#F1F5F9" icon={<Feather name="lock" size={13} color={COLORS.disabled} style={{ marginRight: 4 }} />} />}
                    {has_submitted && <FlagBadge label="Submitted" color={COLORS.success} bgColor={COLORS.success + '18'} icon={<Feather name="check-circle" size={13} color={COLORS.success} style={{ marginRight: 4 }} />} />}
                    {is_result_declared && <FlagBadge label="Result Declared" color={COLORS.purple} bgColor={COLORS.purple + '18'} icon={<MaterialIcons name="bar-chart" size={13} color={COLORS.purple} style={{ marginRight: 4 }} />} />}
                </View>

                {/* Schedule */}
                <SectionHeader title="Schedule" />
                <View style={styles.detailCard}>
                    <InfoRow label="Start Time" value={formatDate(start_at)} />
                    <Divider />
                    <InfoRow label="End Time" value={formatDate(end_at)} />
                </View>

                {/* Resources */}
                <SectionHeader title="Resources" />
                <ResourceRow
                    icon={<Feather name="file-text" size={26} color={can_download_paper ? COLORS.accent : COLORS.disabled} />}
                    title="Question Paper"
                    desc={can_download_paper ? "Tap to download / view PDF" : "Not available yet"}
                    onPress={() => openPDF(question_pdf_url, 'Question Paper')}
                    disabled={!can_download_paper}
                    borderColor={can_download_paper ? COLORS.accent : COLORS.border}
                    rightIcon={<Feather name="download" size={22} color={can_download_paper ? COLORS.accent : COLORS.disabled} />}
                />
                <ResourceRow
                    icon={<MaterialIcons name="assignment-turned-in" size={26} color={model_answer_pdf_url ? COLORS.success : COLORS.disabled} />}
                    title="Model Answer"
                    desc={model_answer_pdf_url ? "Official model solutions PDF" : "Not released yet"}
                    onPress={() => openPDF(model_answer_pdf_url, 'Model Answer')}
                    disabled={!model_answer_pdf_url}
                    borderColor={COLORS.border}
                    rightIcon={<Feather name="download" size={22} color={model_answer_pdf_url ? COLORS.success : COLORS.disabled} />}
                />
                <ResourceRow
                    icon={<Feather name="file" size={26} color={sample_copy_pdf_url ? COLORS.purple : COLORS.disabled} />}
                    title="Sample Answer Copy"
                    desc={sample_copy_pdf_url ? "Reference answer sheet PDF" : "Not available"}
                    onPress={() => openPDF(sample_copy_pdf_url, 'Sample Copy')}
                    disabled={!sample_copy_pdf_url}
                    borderColor={COLORS.border}
                    rightIcon={<Feather name="download" size={22} color={sample_copy_pdf_url ? COLORS.purple : COLORS.disabled} />}
                />

                {/* Upload */}
                <SectionHeader title="Submit Answer Sheet" />
                <UploadSection
                    paperId={paper_id}
                    canUpload={can_upload_answer}
                    hasSubmitted={has_submitted}
                    submission={submission}
                    onSubmitSuccess={fetchTestDetails}
                />

                {/* View Result Button → opens modal */}
                {can_view_result && (
                    <TouchableOpacity style={styles.resultBtn} onPress={() => setResultModalVisible(true)}>
                        <Feather name="award" size={20} color="#fff" />
                        <Text style={styles.resultBtnText}>View Evaluation & Result</Text>
                        <Feather name="chevron-up" size={18} color="#fff" />
                    </TouchableOpacity>
                )}

                {/* Instructions */}
                {instructions && (
                    <>
                        <SectionHeader title="Instructions" />
                        <View style={styles.instrCard}>
                            <Text style={styles.instrText} numberOfLines={instrExpanded ? undefined : 5}>
                                {instructions}
                            </Text>
                            <TouchableOpacity onPress={() => setInstrExpanded(!instrExpanded)} style={styles.readMoreBtn}>
                                <Text style={styles.readMoreText}>{instrExpanded ? 'Show Less ▲' : 'Read More ▼'}</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

            </ScrollView>

            {/* Result Modal */}
            <ResultModal
                visible={resultModalVisible}
                onClose={() => setResultModalVisible(false)}
                submission={submission}
                totalMarks={total_marks}
                paperTitle={paper_title}
            />
        </SafeAreaView>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    loadingText: { marginTop: 12, color: COLORS.muted, fontSize: 15 },
    retryBtn: { marginTop: 16, backgroundColor: COLORS.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },

    header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    backBtn: { padding: 6, marginRight: 10 },
    headerTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text, flex: 1 },
    statusChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    statusChipText: { fontSize: 12, fontWeight: '700' },

    scrollContent: { padding: 16, paddingBottom: 40 },

    mainCard: { backgroundColor: COLORS.card, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14, elevation: 2 },
    testTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 18 },
    infoGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    infoSep: { width: 1, height: 36, backgroundColor: COLORS.border },
    infoItem: { alignItems: 'center', flex: 1 },
    infoValue: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginTop: 5 },
    infoLabel: { fontSize: 11, color: COLORS.muted, marginTop: 3 },

    timerBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, marginTop: 16, gap: 8 },
    timerLabel: { color: COLORS.accent, fontWeight: '600', fontSize: 13, flex: 1 },
    timerValue: { color: COLORS.accent, fontWeight: '800', fontSize: 18, fontVariant: ['tabular-nums'] },

    flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
    flagBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    flagText: { fontSize: 12.5, fontWeight: '700' },

    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10, marginTop: 4 },

    detailCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, overflow: 'hidden' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    detailLabel: { fontSize: 13.5, color: COLORS.muted },
    detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, flexShrink: 1, textAlign: 'right', marginLeft: 12 },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },

    resourceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border, elevation: 1 },
    disabledCard: { opacity: 0.55 },
    iconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    resourceInfo: { flex: 1, marginLeft: 14 },
    resourceTitle: { fontSize: 15.5, fontWeight: '700', color: COLORS.text },
    resourceDesc: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
    rightIcon: { marginLeft: 8 },

    uploadCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16, elevation: 1 },
    uploadCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.accent, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, marginBottom: 12, backgroundColor: '#FEF2F2' },
    pickBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
    pickedFileBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    pickedFileName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
    pickedFileMeta: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
    removeFileBtn: { padding: 4 },
    progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    progressBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
    progressText: { fontSize: 13, fontWeight: '700', color: COLORS.accent, width: 36 },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14 },
    submitBtnDisabled: { backgroundColor: COLORS.disabled },
    submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    viewFileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, marginTop: 4, justifyContent: 'center' },
    viewFileBtnText: { color: COLORS.accent, fontWeight: '600', fontSize: 14, flex: 1 },

    resultBtn: { backgroundColor: COLORS.success, paddingVertical: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 16 },
    resultBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    instrCard: { backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 16 },
    instrText: { fontSize: 13.5, color: COLORS.text, lineHeight: 21 },
    readMoreBtn: { marginTop: 10, alignSelf: 'flex-start' },
    readMoreText: { color: COLORS.accent, fontWeight: '600', fontSize: 13.5 },

    // ── Modal ──
    modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
    modalSheet: {
        backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        maxHeight: '90%', paddingTop: 12,
    },
    modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
    modalSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
    modalCloseBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 20 },

    scoreHero: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 },
    scoreCircle: {
        width: 120, height: 120, borderRadius: 60,
        borderWidth: 8, alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F8FAFC',
    },
    scoreMarks: { fontSize: 28, fontWeight: '900' },
    scoreDivider: { fontSize: 12, color: COLORS.muted },
    scorePct: { fontSize: 15, fontWeight: '700', marginTop: 2 },

    scoreRight: { flex: 1, gap: 8 },
    resultBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
    resultBadgeLargeText: { fontWeight: '800', fontSize: 15 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
    statusBadgeText: { fontSize: 12.5, fontWeight: '600' },
    scoreLabel: { fontSize: 12, color: COLORS.muted },
    scoreMarksBig: { fontSize: 26, fontWeight: '900' },
    scoreTotalLabel: { fontSize: 12, color: COLORS.muted },

    pdfButtonsWrap: { paddingHorizontal: 16, gap: 10, marginTop: 16 },
    pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16 },
    pdfBtnText: { flex: 1, fontWeight: '600', fontSize: 14 },

    modalCloseFullBtn: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#F1F5F9', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    modalCloseFullBtnText: { fontWeight: '700', color: COLORS.muted, fontSize: 15 },
});