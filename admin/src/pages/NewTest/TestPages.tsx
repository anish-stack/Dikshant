import { useState, useEffect, useMemo } from "react";
import { useFetch } from "../../hooks/useFetch";
import api from "../../utils/axiosInstance";
import type { ToastAPI, Series, Test, TestForm, BadgeColor } from "../../utils/types";
import toast from "react-hot-toast";
import MainsPaperPage from "./MainsPaperPage";
import { Link } from "react-router";

const defaultForm: TestForm = {
  series_id: "",
  title: "",
  test_number: "",
  model_answer_pdf_url: "",
  type: "prelims",
  status: "draft",
  scheduled_start: "",
  scheduled_end: "",
  duration_minutes: "120",
  total_marks: "200",
  negative_marking: "0.67",
  is_free: false,
  instructions: "",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  live: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-red-50 text-red-600 border-red-200",
  result_published: "bg-blue-50 text-blue-700 border-blue-200",
};

const STATUS_DOT: Record<string, string> = {
  draft: "bg-slate-400",
  scheduled: "bg-amber-400",
  live: "bg-emerald-500",
  closed: "bg-red-400",
  result_published: "bg-blue-500",
};

type Mode = "list" | "create" | "edit";
type FilterState = {
  search: string;
  seriesId: string;
  status: string;
  type: string;
  isFree: "all" | "free" | "paid";
};

export default function TestsPage() {
  const [mode, setMode] = useState<Mode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestForm>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [mainsTestId, setMainsTestId] = useState<string | null>(null);
  const [mainsTestTitle, setMainsTestTitle] = useState<string>("");
  const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "", seriesId: "", status: "", type: "", isFree: "all",
  });

  const { data: seriesData } = useFetch<Series>("/new/test-series");
  const { data: testsData, loading: fetching, setData: setTests } = useFetch<Test>("/new/tests/admin/list");

  const allSeries = seriesData?.series ?? (Array.isArray(seriesData) ? seriesData : []);
  const allTests = testsData?.tests ?? (Array.isArray(testsData) ? testsData : []);

  const filteredTests = useMemo(() => {
    return allTests
      .filter((t) => {
        const matchesSearch = !filters.search || t.title.toLowerCase().includes(filters.search.toLowerCase());
        const matchesSeries = !filters.seriesId || t.series_id === filters.seriesId;
        const matchesStatus = !filters.status || t.status === filters.status;
        const matchesType = !filters.type || t.type === filters.type;
        const matchesFree =
          filters.isFree === "all" ||
          (filters.isFree === "free" && t.is_free === true) ||
          (filters.isFree === "paid" && t.is_free === false);
        return matchesSearch && matchesSeries && matchesStatus && matchesType && matchesFree;
      })
      .sort((a, b) => (a.test_number || 0) - (b.test_number || 0));
  }, [allTests, filters]);

  useEffect(() => {
    if (mode === "create") { setForm(defaultForm); setEditingId(null); setAnswerKeyFile(null); }
  }, [mode]);

  const handleChange = <K extends keyof TestForm>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = (e.target as HTMLInputElement).type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
    };

  const loadForEdit = (test: Test) => {
    setForm({
      series_id: test.series_id || "",
      title: test.title,
      test_number: test.test_number?.toString() || "",
      type: test.type || "prelims",
      status: test.status || "draft",
      model_answer_pdf_url: test.model_answer_pdf_url || "",
      scheduled_start: test.scheduled_start ? test.scheduled_start.slice(0, 16) : "",
      scheduled_end: test.scheduled_end ? test.scheduled_end.slice(0, 16) : "",
      duration_minutes: test.duration_minutes?.toString() || "120",
      total_marks: test.total_marks?.toString() || "200",
      negative_marking: test.negative_marking?.toString() || "0.67",
      is_free: test.is_free || false,
      instructions: test.instructions || "",
    });
    setEditingId(test.id);
    setMode("edit");
  };

  const submit = async () => {
    if (!form.series_id || !form.title?.trim()) return toast.error("Series and title required");
    setLoading(true);
    try {
      const isEdit = mode === "edit" && editingId;
      let response;

      if (answerKeyFile) {
        const fd = new FormData();
        fd.append("answerKey", answerKeyFile);
        const payload = {
          ...form,
          test_number: parseInt(form.test_number) || 1,
          duration_minutes: parseInt(form.duration_minutes) || 120,
          total_marks: parseInt(form.total_marks) || 200,
          negative_marking: parseFloat(form.negative_marking) || 0,
        };
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
        response = await api({
          method: isEdit ? "put" : "post",
          url: isEdit ? `/new/tests/${editingId}` : "/new/tests",
          data: fd,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const payload = {
          ...form,
          test_number: parseInt(form.test_number) || 1,
          duration_minutes: parseInt(form.duration_minutes) || 120,
          total_marks: parseInt(form.total_marks) || 200,
          negative_marking: parseFloat(form.negative_marking) || 0,
        };
        response = await api({
          method: isEdit ? "put" : "post",
          url: isEdit ? `/new/tests/${editingId}` : "/new/tests",
          data: payload,
        });
      }

      toast.success(isEdit ? "Test updated!" : "Test created!");
      const r = await api.get("/new/tests/admin/list");
      const raw = r.data;
      setTests(Array.isArray(raw) ? raw : (raw as any).data ?? []);
      setForm(defaultForm); setMode("list"); setEditingId(null); setAnswerKeyFile(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message);
    } finally { setLoading(false); }
  };

  const deleteTest = async (id: string) => {
    if (!window.confirm("Delete this test?")) return;
    try {
      await api.delete(`/new/tests/${id}`);
      setTests((prev) => prev.filter((t) => t.id !== id));
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Delete failed");
    }
  };

  const resetFilters = () => setFilters({ search: "", seriesId: "", status: "", type: "", isFree: "all" });

  // ── Mains Paper fullscreen overlay ─────────────────────────────────────────
  if (mainsTestId) {
    return (
      <MainsPaperPage
        testId={mainsTestId}
        testTitle={mainsTestTitle}
        onClose={() => { setMainsTestId(null); setMainsTestTitle(""); }}
      />
    );
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition";
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tests</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage mock tests inside series</p>
        </div>
        {mode === "list" && (
          <button
            onClick={() => setMode("create")}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Create Test
          </button>
        )}
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">

        {/* ── Create / Edit Form ── */}
        {(mode === "create" || mode === "edit") && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Form header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {mode === "create"
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    }
                  </svg>
                </div>
                <h2 className="text-base font-bold text-slate-800">
                  {mode === "create" ? "New Test" : "Edit Test"}
                </h2>
              </div>
              <button onClick={() => { setMode("list"); setForm(defaultForm); setEditingId(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {/* Series */}
                <div className="lg:col-span-2">
                  <label className={labelCls}>Series <span className="text-red-400">*</span></label>
                  <select className={inputCls} value={form.series_id} onChange={handleChange("series_id")}>
                    <option value="">Select series...</option>
                    {allSeries.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={form.type} onChange={handleChange("type")}>
                    <option value="prelims">Prelims</option>
                    <option value="mains">Mains</option>
                  </select>
                </div>

                {/* Title */}
                <div className="lg:col-span-2">
                  <label className={labelCls}>Test Title <span className="text-red-400">*</span></label>
                  <input className={inputCls} value={form.title} onChange={handleChange("title")} placeholder="GS Prelims Mock Test 1 — Polity & History" />
                </div>

                {/* Test # */}
                <div>
                  <label className={labelCls}>Test Number</label>
                  <input type="number" className={inputCls} value={form.test_number} onChange={handleChange("test_number")} placeholder="1" />
                </div>

                {/* Status */}
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={form.status} onChange={handleChange("status")}>
                    {(["draft", "scheduled", "live", "closed", "result_published"] as const).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className={labelCls}>Duration (min)</label>
                  <input type="number" className={inputCls} value={form.duration_minutes} onChange={handleChange("duration_minutes")} placeholder="120" />
                </div>

                {/* Total marks */}
                <div>
                  <label className={labelCls}>Total Marks</label>
                  <input type="number" className={inputCls} value={form.total_marks} onChange={handleChange("total_marks")} />
                </div>

                {/* Negative marking */}
                <div>
                  <label className={labelCls}>Negative Marking</label>
                  <input type="number" step="0.01" className={inputCls} value={form.negative_marking} onChange={handleChange("negative_marking")} />
                </div>

                {/* Scheduled start */}
                <div>
                  <label className={labelCls}>Scheduled Start</label>
                  <input type="datetime-local" className={inputCls} value={form.scheduled_start} onChange={handleChange("scheduled_start")} />
                </div>

                {/* Scheduled end */}
                <div>
                  <label className={labelCls}>Scheduled End</label>
                  <input type="datetime-local" className={inputCls} value={form.scheduled_end} onChange={handleChange("scheduled_end")} />
                </div>

                {/* Instructions */}
                <div className="lg:col-span-3">
                  <label className={labelCls}>Instructions</label>
                  <textarea className={`${inputCls} resize-none`} rows={3} value={form.instructions} onChange={handleChange("instructions")} placeholder="Test instructions shown to students..." />
                </div>
                {/* Answer Key PDF */}
                <div className="lg:col-span-3">
                  <label className={labelCls}>Answer Key PDF</label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition group">
                      <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        {answerKeyFile ? (
                          <p className="text-sm font-medium text-indigo-700 truncate">{answerKeyFile.name}</p>
                        ) : form.model_answer_pdf_url ? (
                          <p className="text-sm text-slate-500 truncate">Current: <a href={form.model_answer_pdf_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline" onClick={e => e.stopPropagation()}>View PDF</a> — upload new to replace</p>
                        ) : (
                          <p className="text-sm text-slate-400">Click to upload answer key PDF</p>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => setAnswerKeyFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                    {answerKeyFile && (
                      <button
                        type="button"
                        onClick={() => setAnswerKeyFile(null)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Free checkbox */}
              <div className="mt-5 p-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_free"
                  checked={form.is_free}
                  onChange={handleChange("is_free")}
                  className="w-5 h-5 rounded accent-emerald-600 cursor-pointer"
                />
                <label htmlFor="is_free" className="cursor-pointer">
                  <span className="text-sm font-semibold text-emerald-800">Free Test</span>
                  <span className="text-xs text-emerald-600 ml-2">— accessible without subscription</span>
                </label>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setMode("list"); setForm(defaultForm); setEditingId(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 transition shadow-sm"
                >
                  {loading ? (
                    <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" /></svg>{mode === "create" ? "Creating..." : "Updating..."}</>
                  ) : (mode === "create" ? "Create Test" : "Update Test")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── List View ── */}
        {mode === "list" && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <div className="flex flex-wrap gap-3 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[220px]">
                  <label className={labelCls}>Search</label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
                    <input
                      type="text"
                      placeholder="Search tests..."
                      className={`${inputCls} pl-9`}
                      value={filters.search}
                      onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Series filter */}
                <div className="w-52">
                  <label className={labelCls}>Series</label>
                  <select className={inputCls} value={filters.seriesId} onChange={(e) => setFilters((p) => ({ ...p, seriesId: e.target.value }))}>
                    <option value="">All Series</option>
                    {allSeries.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>

                {/* Status */}
                <div className="w-44">
                  <label className={labelCls}>Status</label>
                  <select className={inputCls} value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}>
                    <option value="">All</option>
                    {(["draft", "scheduled", "live", "closed", "result_published"] as const).map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div className="w-36">
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={filters.type} onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}>
                    <option value="">All</option>
                    <option value="prelims">Prelims</option>
                    <option value="mains">Mains</option>
                  </select>
                </div>

                {/* Free/Paid */}
                <div className="w-36">
                  <label className={labelCls}>Access</label>
                  <select className={inputCls} value={filters.isFree} onChange={(e) => setFilters((p) => ({ ...p, isFree: e.target.value as any }))}>
                    <option value="all">All</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                <button
                  onClick={resetFilters}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50 transition"
                >
                  Reset
                </button>
              </div>

              {/* Count bar */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing <span className="font-semibold text-slate-700">{filteredTests.length}</span> of <span className="font-semibold text-slate-700">{allTests.length}</span> tests</span>
                <div className="flex gap-4">
                  {(["draft", "scheduled", "live", "closed", "result_published"] as const).map((s) => {
                    const count = allTests.filter((t) => t.status === s).length;
                    if (!count) return null;
                    return (
                      <span key={s} className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />
                        {s.replace(/_/g, " ")} {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tests list */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {fetching ? (
                <div className="flex items-center justify-center py-20">
                  <svg className="w-8 h-8 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-75" /></svg>
                </div>
              ) : filteredTests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm font-medium">No tests found</p>
                  <p className="text-xs mt-1">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTests.map((t: any) => (
                    <div key={t.id} className="group px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Left: info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Test # pill */}
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 rounded-md px-2 py-0.5">
                              #{t.test_number}
                            </span>
                            <p className="font-semibold text-slate-900 text-sm truncate">{t.title}</p>

                            {/* Status */}
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[t.status] ?? STATUS_COLORS.draft}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[t.status] ?? "bg-slate-400"}`} />
                              {t.status.replace(/_/g, " ")}
                            </span>

                            {/* Type */}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === "prelims" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
                              {t.type.toUpperCase()}
                            </span>

                            {t.is_free && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                FREE
                              </span>
                            )}
                          </div>

                          {t.series?.title && (
                            <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                              {t.series.title}
                            </p>
                          )}

                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
                              {t.duration_minutes} min
                            </span>
                            <span>{t.total_marks} marks</span>
                            {t.total_questions && <span>{t.total_questions} questions</span>}
                            {t.attempt_count > 0 && (
                              <span className="text-indigo-400">{t.attempt_count} attempts</span>
                            )}
                            {t.scheduled_start && (
                              <span>{new Date(t.scheduled_start).toLocaleString()}</span>
                            )}
                          </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Mains paper button — only for mains type */}
                          {t.type === "mains" && (
                            <>

                              <button
                                onClick={() => { setMainsTestId(t.id); setMainsTestTitle(t.title); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Question Paper
                              </button>


                              <Link to={`/check-submission/${t.id}`}>
                                <button className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200">

                                  {/* Icon */}
                                  <span className="flex items-center justify-center w-5 h-5 rounded-md bg-white/20 group-hover:bg-white/30 transition">
                                    <svg
                                      className="w-3.5 h-3.5 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  </span>

                                  {/* Text */}
                                  <span>Check Submissions</span>

                                  {/* Hover glow */}
                                  <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition" />
                                </button>
                              </Link>
                            </>
                          )}

                          <button
                            onClick={() => loadForEdit(t)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTest(t.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}