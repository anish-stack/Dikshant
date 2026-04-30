import { useState, useEffect, useRef } from "react";
import api from "../../utils/axiosInstance";
import toast from "react-hot-toast";

interface MainsPaper {
    id: string;
    test_id: string;
    paper_title: string;
    instructions?: string;
    duration_minutes?: number;
    total_questions?: number;
    total_marks?: number;
    submission_type?: string;
    publish_at?: string;
    start_at?: string;
    end_at?: string;
    paper_status?: string;
    question_pdf_url?: string;
    model_answer_pdf_url?: string;
    created_at?: string;
    updated_at?: string;
}

interface Props {
    testId: string;
    testTitle: string;
    onClose: () => void;
}

const defaultForm = {
    paper_title: "",
    instructions: "",
    duration_minutes: "180",
    total_questions: "",
    total_marks: "250",
    submission_type: "online",
    publish_at: "",
    start_at: "",
    end_at: "",
};

const STATUS_STYLE: Record<string, string> = {
    draft: "bg-slate-100 text-slate-600",
    published: "bg-emerald-100 text-emerald-700",
    active: "bg-blue-100 text-blue-700",
    closed: "bg-red-100 text-red-600",
};

type FormMode = "idle" | "create" | "edit";

export default function MainsPaperPage({ testId, testTitle, onClose }: Props) {
    const [papers, setPapers] = useState<MainsPaper[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formMode, setFormMode] = useState<FormMode>("idle");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...defaultForm });
    const [questionPdf, setQuestionPdf] = useState<File | null>(null);
    const [modelAnswerPdf, setModelAnswerPdf] = useState<File | null>(null);
    const [statusModal, setStatusModal] = useState<{ id: string; current: string } | null>(null);
    const [newStatus, setNewStatus] = useState("");
    const qPdfRef = useRef<HTMLInputElement>(null);
    const mPdfRef = useRef<HTMLInputElement>(null);

    // ── Load papers ──────────────────────────────────────────────────────────
    const fetchPapers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/new/mains-paper/${testId}`);

            console.log("Fetched papers:", res.data);

            const paper = res.data?.data?.paper;

            setPapers(paper ? [paper] : []);

        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to load papers");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { fetchPapers(); }, [testId]);

    const openCreate = () => {
        setForm({ ...defaultForm });
        setQuestionPdf(null);
        setModelAnswerPdf(null);
        setEditingId(null);
        setFormMode("create");
    };

    const openEdit = (p: MainsPaper) => {
        setForm({
            paper_title: p.paper_title || "",
            instructions: p.instructions || "",
            duration_minutes: p.duration_minutes?.toString() || "180",
            total_questions: p.total_questions?.toString() || "",
            total_marks: p.total_marks?.toString() || "250",
            submission_type: p.submission_type || "online",
            publish_at: p.publish_at ? p.publish_at.slice(0, 16) : "",
            start_at: p.start_at ? p.start_at.slice(0, 16) : "",
            end_at: p.end_at ? p.end_at.slice(0, 16) : "",
        });
        setQuestionPdf(null);
        setModelAnswerPdf(null);
        setEditingId(p.id);
        setFormMode("edit");
    };

    const closeForm = () => { setFormMode("idle"); setEditingId(null); setForm({ ...defaultForm }); };

    const handleChange = (key: keyof typeof defaultForm) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            setForm((p) => ({ ...p, [key]: e.target.value }));

    const submit = async () => {
        if (!form.paper_title.trim()) return toast.error("Paper title required");
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
            if (formMode === "create") fd.append("test_id", testId);
            if (questionPdf) fd.append("question_pdf", questionPdf);
            if (modelAnswerPdf) fd.append("model_answer_pdf", modelAnswerPdf);

            if (formMode === "create") {
                await api.post("/new/mains-paper", fd, { headers: { "Content-Type": "multipart/form-data" } });
                toast.success("Paper created!");
            } else {
                await api.put(`/new/mains-paper/${editingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                toast.success("Paper updated!");
            }
            closeForm();
            fetchPapers();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Save failed");
        } finally { setSaving(false); }
    };

    const deletePaper = async (id: string) => {
        if (!window.confirm("Delete this question paper? This cannot be undone.")) return;
        try {
            await api.delete(`/new/mains-paper/${id}`);
            setPapers((p) => p.filter((x) => x.id !== id));
            toast.success("Deleted");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Delete failed");
        }
    };

    const patchStatus = async () => {
        if (!statusModal || !newStatus) return;
        try {
            await api.patch(`/new/mains-paper/${statusModal.id}/status`, { status: newStatus });
            toast.success("Status updated");
            setStatusModal(null);
            fetchPapers();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Update failed");
        }
    };

    const inputCls = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 transition";
    const labelCls = "block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-50">

            {/* ── Top bar ─────────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 mt-20 bg-white border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
                    {/* Back */}
                    <button
                        onClick={onClose}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        Tests
                    </button>

                    <span className="text-slate-300">/</span>

                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase tracking-wide flex-shrink-0">Mains</span>
                        <h1 className="text-base font-bold text-slate-900 truncate">{testTitle}</h1>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">{papers.length} paper{papers.length !== 1 ? "s" : ""}</span>
                        {formMode === "idle" && (
                            <button
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 active:scale-95 transition-all shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Paper
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Main content ─────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

                    {/* ── Create / Edit form panel ─────────────────────────────── */}
                    {formMode !== "idle" && (
                        <div className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden">
                            {/* Form header */}
                            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <h2 className="text-sm font-bold text-slate-800">
                                        {formMode === "create" ? "New Question Paper" : "Edit Question Paper"}
                                    </h2>
                                </div>
                                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 transition">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Row 1: title + submission type */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className={labelCls}>Paper Title <span className="text-red-400 normal-case font-normal">*</span></label>
                                        <input className={inputCls} value={form.paper_title} onChange={handleChange("paper_title")} placeholder="GS Paper I — History, Geography & Society" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Submission Type</label>
                                        <select className={inputCls} value={form.submission_type} onChange={handleChange("submission_type")}>
                                            <option value="online">Online</option>
                                            <option value="offline">Offline</option>
                                            <option value="hybrid">Hybrid</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: marks / questions / duration */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className={labelCls}>Total Marks</label>
                                        <input type="number" className={inputCls} value={form.total_marks} onChange={handleChange("total_marks")} placeholder="250" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Total Questions</label>
                                        <input type="number" className={inputCls} value={form.total_questions} onChange={handleChange("total_questions")} placeholder="20" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Duration (min)</label>
                                        <input type="number" className={inputCls} value={form.duration_minutes} onChange={handleChange("duration_minutes")} placeholder="180" />
                                    </div>
                                </div>

                                {/* Row 3: dates */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Publish At</label>
                                        <input type="datetime-local" className={inputCls} value={form.publish_at} onChange={handleChange("publish_at")} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Start At</label>
                                        <input type="datetime-local" className={inputCls} value={form.start_at} onChange={handleChange("start_at")} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>End At</label>
                                        <input type="datetime-local" className={inputCls} value={form.end_at} onChange={handleChange("end_at")} />
                                    </div>
                                </div>

                                {/* Instructions */}
                                <div>
                                    <label className={labelCls}>Instructions</label>
                                    <textarea className={`${inputCls} resize-none`} rows={3} value={form.instructions} onChange={handleChange("instructions")} placeholder="Instructions shown to candidates before starting..." />
                                </div>

                                {/* PDF uploads */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Question PDF */}
                                    <div>
                                        <label className={labelCls}>Question PDF</label>
                                        <div
                                            onClick={() => qPdfRef.current?.click()}
                                            className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition"
                                        >
                                            <input ref={qPdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setQuestionPdf(e.target.files?.[0] || null)} />
                                            {questionPdf ? (
                                                <>
                                                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    <p className="text-xs font-semibold text-purple-700 text-center truncate max-w-full px-2">{questionPdf.name}</p>
                                                    <p className="text-xs text-slate-400">{(questionPdf.size / 1024).toFixed(0)} KB</p>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-7 h-7 text-slate-300 group-hover:text-purple-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    <p className="text-xs text-slate-500 text-center">Click to upload <span className="font-semibold text-purple-600">Question PDF</span></p>
                                                    <p className="text-xs text-slate-400">PDF only</p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Model Answer PDF */}
                                    <div>
                                        <label className={labelCls}>Model Answer PDF</label>
                                        <div
                                            onClick={() => mPdfRef.current?.click()}
                                            className="group relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition"
                                        >
                                            <input ref={mPdfRef} type="file" accept=".pdf" className="hidden" onChange={(e) => setModelAnswerPdf(e.target.files?.[0] || null)} />
                                            {modelAnswerPdf ? (
                                                <>
                                                    <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    <p className="text-xs font-semibold text-emerald-700 text-center truncate max-w-full px-2">{modelAnswerPdf.name}</p>
                                                    <p className="text-xs text-slate-400">{(modelAnswerPdf.size / 1024).toFixed(0)} KB</p>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-7 h-7 text-slate-300 group-hover:text-emerald-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                    <p className="text-xs text-slate-500 text-center">Click to upload <span className="font-semibold text-emerald-600">Model Answer PDF</span></p>
                                                    <p className="text-xs text-slate-400">PDF only</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                                    <button onClick={closeForm} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submit}
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 transition shadow-sm"
                                    >
                                        {saving ? (
                                            <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" /></svg>Saving...</>
                                        ) : formMode === "create" ? "Create Paper" : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Papers list ─────────────────────────────────────────────── */}
                    {loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="text-center">
                                <svg className="w-10 h-10 animate-spin text-purple-400 mx-auto" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" /></svg>
                                <p className="mt-3 text-sm text-slate-500">Loading papers...</p>
                            </div>
                        </div>
                    ) : papers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <p className="text-base font-semibold text-slate-600">No question papers yet</p>
                            <p className="text-sm mt-1">Click <span className="font-medium text-purple-600">
                                <button onClick={openCreate}>
                                    Add Paper
                                </button>
                            </span> to create the first one</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {papers.map((p) => (
                                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    {/* Card header */}
                                    <div className="px-5 py-4 flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-slate-900">{p.paper_title}</h3>
                                                {p.paper_status && (
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[p.paper_status] ?? STATUS_STYLE.draft}`}>
                                                        {p.paper_status}
                                                    </span>
                                                )}
                                                {p.submission_type && (
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                                        {p.submission_type}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Stats row */}
                                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                                                {p.total_marks && (
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                        {p.total_marks} marks
                                                    </span>
                                                )}
                                                {p.total_questions && (
                                                    <span>{p.total_questions} questions</span>
                                                )}
                                                {p.duration_minutes && (
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
                                                        {p.duration_minutes} min
                                                    </span>
                                                )}
                                                {p.start_at && (
                                                    <span className="flex items-center gap-1">
                                                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>
                                                        {new Date(p.start_at).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>

                                            {p.instructions && (
                                                <p className="mt-2 text-xs text-slate-400 line-clamp-2">{p.instructions}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-col gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => openEdit(p)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => { setStatusModal({ id: p.id, current: p.status || "draft" }); setNewStatus(p.status || "draft"); }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                Status
                                            </button>
                                            <button
                                                onClick={() => deletePaper(p.id)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* PDF links */}
                                    {(p.question_pdf_url || p.model_answer_pdf_url) && (
                                        <div className="px-5 pb-4 flex gap-3">
                                            {p.question_pdf_url && (
                                                <a
                                                    href={p.question_pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-100 transition"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                    Question PDF
                                                </a>
                                            )}
                                            {p.model_answer_pdf_url && (
                                                <a
                                                    href={p.model_answer_pdf_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 hover:bg-emerald-100 transition"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    Model Answer
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Status modal ─────────────────────────────────────────────────── */}
            {statusModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setStatusModal(null)} />
                    <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
                        <h3 className="text-base font-bold text-slate-900 mb-1">Update Status</h3>
                        <p className="text-xs text-slate-500 mb-4">Current: <span className="font-semibold capitalize">{statusModal.current}</span></p>
                        <select
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 mb-4 transition"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            {(["draft", "published", "active", "closed"] as const).map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setStatusModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition">Cancel</button>
                            <button onClick={patchStatus} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition">Update</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}