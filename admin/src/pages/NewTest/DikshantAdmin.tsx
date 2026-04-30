import { useState, useEffect, useCallback } from "react";
import axios from "axios";

// ─── AXIOS INSTANCE ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "https://www.app.api.dikshantias.com/api/new",
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || "Request failed";
    return Promise.reject(new Error(msg));
  }
);

// ─── TYPES ───────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastAPI {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

interface Series {
  id: string;
  title: string;
  slug: string;
  type: "prelims" | "mains";
  description?: string;
  total_tests: number;
  price: number;
  discount_price?: number | null;
  is_free: boolean;
  is_active: boolean;
  thumbnail_url?: string;
}

interface Test {
  id: string;
  series_id: string;
  title: string;
  test_number: number;
  type: "prelims" | "mains";
  status: "draft" | "scheduled" | "live" | "closed" | "result_published";
  scheduled_start?: string;
  scheduled_end?: string;
  duration_minutes: number;
  total_marks: number;
  negative_marking: number;
  is_free: boolean;
  instructions?: string;
}

interface Question {
  id: string;
  test_id: string;
  question_text: string;
  subject?: string;
  topic?: string;
  difficulty: "easy" | "medium" | "hard";
  correct_option: number;
  marks: number;
  explanation?: string;
  source?: string;
  video_url?: string;
  article_url?: string;
  order_index: number;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  max_uses: number;
  used_count?: number;
  valid_from?: string;
  valid_until?: string;
  min_amount?: number;
  is_active: boolean;
}

interface Purchase {
  id: string;
  user_id: string;
  user?: { name: string; email: string };
  purchase_type: "series" | "test";
  amount_paid: number;
  discount_applied?: number;
  payment_id?: string;
  payment_status: "success" | "pending" | "failed" | "refunded";
  createdAt?: string;
}

// ─── HOOKS ───────────────────────────────────────────────────────────────────
function useToast(): { toasts: Toast[] } & ToastAPI {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (msg: string, type: ToastType) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };
  return { toasts, success: (m) => add(m, "success"), error: (m) => add(m, "error") };
}

function useFetch<T>(endpoint: string, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data?: T[] } | T[]>(endpoint);
      const raw = r.data;
      setData(Array.isArray(raw) ? raw : (raw as { data?: T[] }).data ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => { fetch(); }, deps);
  return { data, setData, loading, refetch: fetch };
}

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────
const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(" ");

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow";

const btnPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

const btnSecondary =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors";

const btnDanger =
  "inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <h2 className="mb-4 text-sm font-bold text-slate-700 uppercase tracking-wider">{title}</h2>;
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

type BadgeColor = "gray" | "green" | "blue" | "yellow" | "red" | "purple" | "indigo";
const badgeColors: Record<BadgeColor, string> = {
  gray:   "bg-slate-100 text-slate-600",
  green:  "bg-emerald-100 text-emerald-700",
  blue:   "bg-blue-100 text-blue-700",
  yellow: "bg-amber-100 text-amber-700",
  red:    "bg-red-100 text-red-700",
  purple: "bg-violet-100 text-violet-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: BadgeColor }) {
  return (
    <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold", badgeColors[color])}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-14">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-slate-400">
      <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
            t.type === "success" ? "bg-emerald-600" : "bg-red-500"
          )}
        >
          <span>{t.type === "success" ? "✓" : "✕"}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={cx("rounded-xl p-4 border", color)}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 1 — TEST SERIES
// ═══════════════════════════════════════════════════════════════════════════
interface SeriesForm {
  title: string; slug: string; type: "prelims" | "mains"; description: string;
  total_tests: string; price: string; discount_price: string;
  is_free: boolean; is_active: boolean; thumbnail_url: string;
}

const defaultSeriesForm: SeriesForm = {
  title: "", slug: "", type: "prelims", description: "",
  total_tests: "", price: "", discount_price: "", is_free: false, is_active: true, thumbnail_url: ""
};

function CreateTestSeries({ toast }: { toast: ToastAPI }) {
  const [form, setForm] = useState<SeriesForm>(defaultSeriesForm);
  const [loading, setLoading] = useState(false);
  const { data, loading: fetching, setData: setSeries } = useFetch<Series>("/test-series");
  console.log(data);

  const set = <K extends keyof SeriesForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const autoSlug = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm((p) => ({
      ...p, title: v,
      slug: v.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    }));
  };

  const submit = async () => {
    if (!form.title || !form.type) return toast.error("Title and type required");
    setLoading(true);
    try {
      await api.post<Series>("/test-series", {
        ...form,
        price: parseFloat(form.price) || 0,
        discount_price: parseFloat(form.discount_price) || null,
        total_tests: parseInt(form.total_tests) || 0,
      });
      toast.success("Test series created!");
      setForm(defaultSeriesForm);
      const r = await api.get<{ data?: Series[] } | Series[]>("/test-series");
      const raw = r.data;
      setSeries(Array.isArray(raw) ? raw : (raw as { data?: Series[] }).data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const deleteSeries = async (id: string) => {
    if (!window.confirm("Delete this series?")) return;
    try {
      await api.delete(`/test-series/${id}`);
      setSeries((p) => p.filter((s) => s.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const series = data?.series ?? (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <PageHeader title="Test Series" subtitle="Create and manage UPSC test series" />
      <Card>
        <SectionHeader title="Create New Series" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Title *">
            <input className={inputCls} value={form.title} onChange={autoSlug} placeholder="UPSC Prelims 2025 Complete Mock Series" />
          </Field>
          <Field label="Slug">
            <input className={inputCls} value={form.slug} onChange={set("slug")} placeholder="upsc-prelims-2025" />
          </Field>
          <Field label="Type *">
            <select className={inputCls} value={form.type} onChange={set("type")}>
              <option value="prelims">Prelims</option>
              <option value="mains">Mains</option>
            </select>
          </Field>
          <Field label="Total Tests">
            <input className={inputCls} type="number" value={form.total_tests} onChange={set("total_tests")} placeholder="25" />
          </Field>
          <Field label="Price (₹)">
            <input className={inputCls} type="number" value={form.price} onChange={set("price")} placeholder="999" />
          </Field>
          <Field label="Discount Price (₹)">
            <input className={inputCls} type="number" value={form.discount_price} onChange={set("discount_price")} placeholder="799" />
          </Field>
          <Field label="Thumbnail URL">
            <input className={inputCls} value={form.thumbnail_url} onChange={set("thumbnail_url")} placeholder="https://cdn.dikshantias.com/..." />
          </Field>
          <Field label="Description">
            <textarea className={cx(inputCls, "resize-none")} rows={3} value={form.description} onChange={set("description")} placeholder="Series description..." />
          </Field>
        </div>
        <div className="mt-4 flex gap-6">
          {(["is_free", "is_active"] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={form[k]} onChange={set(k)} />
              {k === "is_free" ? "Free series" : "Active"}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button className={btnPrimary} onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Series"}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="All Series" />
        {fetching ? <Spinner /> : series.length === 0 ? <EmptyState message="No series yet" /> : (
          <div className="divide-y divide-slate-100">
            {series.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{s.slug} · {s.total_tests} tests · ₹{s.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={s.type === "prelims" ? "blue" : "purple"}>{s.type}</Badge>
                  <Badge color={s.is_active ? "green" : "gray"}>{s.is_active ? "active" : "inactive"}</Badge>
                  <button className={btnDanger} onClick={() => deleteSeries(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 2 — TESTS
// ═══════════════════════════════════════════════════════════════════════════
interface TestForm {
  series_id: string; title: string; test_number: string; type: "prelims" | "mains";
  status: "draft" | "scheduled" | "live" | "closed" | "result_published";
  scheduled_start: string; scheduled_end: string; duration_minutes: string;
  total_marks: string; negative_marking: string; is_free: boolean; instructions: string;
}

const defaultTestForm: TestForm = {
  series_id: "", title: "", test_number: "", type: "prelims", status: "draft",
  scheduled_start: "", scheduled_end: "", duration_minutes: "120",
  total_marks: "200", negative_marking: "0.67", is_free: false, instructions: ""
};

const testStatusColor: Record<string, BadgeColor> = {
  draft: "gray", scheduled: "yellow", live: "green", closed: "red", result_published: "blue"
};

function CreateTest({ toast }: { toast: ToastAPI }) {
  const [form, setForm] = useState<TestForm>(defaultTestForm);
  const [loading, setLoading] = useState(false);
  const { data } = useFetch<Series>("/test-series");
  const { data: testsData, loading: fetching, setData: setTests } = useFetch<Test>("/tests/admin/list");

  const set = <K extends keyof TestForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async () => {
    if (!form.series_id || !form.title) return toast.error("Series and title required");
    setLoading(true);
    try {
      await api.post("/tests/admin/list", {
        ...form,
        test_number: parseInt(form.test_number) || 1,
        duration_minutes: parseInt(form.duration_minutes) || 120,
        total_marks: parseInt(form.total_marks) || 200,
        negative_marking: parseFloat(form.negative_marking) || 0,
      });
      toast.success("Test created!");
      setForm(defaultTestForm);
      const r = await api.get<{ data?: Test[] } | Test[]>("/tests/admin/list");
      const raw = r.data;
      setTests(Array.isArray(raw) ? raw : (raw as { data?: Test[] }).data ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const series = data?.series ?? (Array.isArray(data) ? data : []);
  const tests = testsData?.tests ?? (Array.isArray(testsData) ? testsData : []);
  return (
    <div className="space-y-6">
      <PageHeader title="Tests" subtitle="Create individual tests inside a series" />
      <Card>
        <SectionHeader title="Create New Test" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Series *">
            <select className={inputCls} value={form.series_id} onChange={set("series_id")}>
              <option value="">Select series</option>
              {series?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </Field>
          <Field label="Test Title *">
            <input className={inputCls} value={form.title} onChange={set("title")} placeholder="GS Prelims Mock Test 1 — Polity & History" />
          </Field>
          <Field label="Test Number">
            <input className={inputCls} type="number" value={form.test_number} onChange={set("test_number")} placeholder="1" />
          </Field>
          <Field label="Type">
            <select className={inputCls} value={form.type} onChange={set("type")}>
              <option value="prelims">Prelims</option>
              <option value="mains">Mains</option>
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={form.status} onChange={set("status")}>
              {(["draft", "scheduled", "live", "closed", "result_published"] as const).map((s) => (
                <option key={s} value={s}>{s.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Duration (min)">
            <input className={inputCls} type="number" value={form.duration_minutes} onChange={set("duration_minutes")} />
          </Field>
          <Field label="Scheduled Start">
            <input className={inputCls} type="datetime-local" value={form.scheduled_start} onChange={set("scheduled_start")} />
          </Field>
          <Field label="Scheduled End">
            <input className={inputCls} type="datetime-local" value={form.scheduled_end} onChange={set("scheduled_end")} />
          </Field>
          <Field label="Total Marks">
            <input className={inputCls} type="number" value={form.total_marks} onChange={set("total_marks")} />
          </Field>
          <Field label="Negative Marking">
            <input className={inputCls} type="number" step="0.01" value={form.negative_marking} onChange={set("negative_marking")} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Instructions">
              <textarea className={cx(inputCls, "resize-none")} rows={3} value={form.instructions} onChange={set("instructions")} placeholder="Test instructions shown to students…" />
            </Field>
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={form.is_free} onChange={set("is_free")} />
          Free test
        </label>
        <div className="mt-5 flex justify-end">
          <button className={btnPrimary} onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Test"}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="All Tests" />
        {fetching ? <Spinner /> : tests.length === 0 ? <EmptyState message="No tests yet" /> : (
          <div className="divide-y divide-slate-100">
            {tests.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Test #{t.test_number} · {t.duration_minutes}min · {t.total_marks} marks</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={testStatusColor[t.status] ?? "gray"}>{t.status}</Badge>
                  <Badge color={t.type === "prelims" ? "blue" : "purple"}>{t.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 3 — QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════
interface QuestionForm {
  test_id: string; question_text: string; subject: string; topic: string;
  difficulty: "easy" | "medium" | "hard"; correct_option: string; marks: string;
  explanation: string; source: string; video_url: string; article_url: string; order_index: string;
}

const defaultQForm: QuestionForm = {
  test_id: "", question_text: "", subject: "", topic: "", difficulty: "medium",
  correct_option: "1", marks: "2", explanation: "", source: "", video_url: "", article_url: "", order_index: ""
};

const diffColor: Record<string, BadgeColor> = { easy: "green", medium: "yellow", hard: "red" };

function CreateQuestion({ toast }: { toast: ToastAPI }) {
  const [form, setForm] = useState<QuestionForm>(defaultQForm);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const { data: testsData } = useFetch<Test>("/tests/admin/list");

  useEffect(() => {
    if (!selectedTest) { setQuestions([]); return; }
    api.get<{ data?: Question[] } | Question[]>(`/questions?test_id=${selectedTest}`)
      .then((r) => {
        const raw = r.data;
        setQuestions(Array.isArray(raw) ? raw : (raw as { data?: Question[] }).data ?? []);
      })
      .catch(() => setQuestions([]));
  }, [selectedTest]);

  const set = <K extends keyof QuestionForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const setOpt = (i: number) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setOptions((p) => { const n = [...p]; n[i] = e.target.value; return n; });

  const submit = async () => {
    if (!form.test_id || !form.question_text) return toast.error("Test and question text required");
    if (options.some((o) => !o.trim())) return toast.error("All 4 options required");
    setLoading(true);
    try {
      const qRes = await api.post<{ data?: { id: string }; id?: string }>("/questions", {
        ...form,
        correct_option: parseInt(form.correct_option),
        marks: parseFloat(form.marks) || 2,
        order_index: parseInt(form.order_index) || 1,
      });
      const qId = qRes.data?.data?.id || (qRes.data as { id?: string }).id;
      if (qId) {
        await Promise.all(
          options.map((opt, i) =>
            api.post("/question-options", { question_id: qId, option_number: i + 1, option_text: opt })
          )
        );
      }
      toast.success("Question + options saved!");
      setForm({ ...defaultQForm, test_id: form.test_id });
      setOptions(["", "", "", ""]);
      if (selectedTest === form.test_id) {
        const r = await api.get<{ data?: Question[] } | Question[]>(`/questions?test_id=${selectedTest}`);
        const raw = r.data;
        setQuestions(Array.isArray(raw) ? raw : (raw as { data?: Question[] }).data ?? []);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const tests = testsData?.tests ?? (Array.isArray(testsData) ? testsData : []);

  return (
    <div className="space-y-6">
      <PageHeader title="Questions" subtitle="Add MCQ questions with options and explanations" />
      <Card>
        <SectionHeader title="Add Question" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Test *">
            <select className={inputCls} value={form.test_id}
              onChange={(e) => { set("test_id")(e); setSelectedTest(e.target.value); }}>
              <option value="">Select test</option>
              {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>
          <Field label="Subject">
            <input className={inputCls} value={form.subject} onChange={set("subject")} placeholder="Polity / History / Economy…" />
          </Field>
          <Field label="Topic">
            <input className={inputCls} value={form.topic} onChange={set("topic")} placeholder="Fundamental Rights" />
          </Field>
          <Field label="Difficulty">
            <select className={inputCls} value={form.difficulty} onChange={set("difficulty")}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Marks">
            <input className={inputCls} type="number" value={form.marks} onChange={set("marks")} />
          </Field>
          <Field label="Order Index">
            <input className={inputCls} type="number" value={form.order_index} onChange={set("order_index")} placeholder="1" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Question Text *">
              <textarea className={cx(inputCls, "resize-none")} rows={4} value={form.question_text}
                onChange={set("question_text")} placeholder="Which of the following…" />
            </Field>
          </div>
        </div>

        {/* Options */}
        <div className="mt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Options</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  parseInt(form.correct_option) === i + 1
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600"
                )}>
                  {String.fromCharCode(65 + i)}
                </span>
                <input className={inputCls} value={opt} onChange={setOpt(i)} placeholder={`Option ${i + 1}`} />
              </div>
            ))}
          </div>
          <div className="mt-3 w-44">
            <Field label="Correct Option">
              <select className={inputCls} value={form.correct_option} onChange={set("correct_option")}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>Option {String.fromCharCode(64 + n)}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Explanation">
            <textarea className={cx(inputCls, "resize-none")} rows={3} value={form.explanation}
              onChange={set("explanation")} placeholder="Why this answer is correct…" />
          </Field>
          <div className="space-y-3">
            <Field label="Source">
              <input className={inputCls} value={form.source} onChange={set("source")} placeholder="Laxmikanth Chapter 8" />
            </Field>
            <Field label="Video URL">
              <input className={inputCls} value={form.video_url} onChange={set("video_url")} placeholder="https://youtube.com/…" />
            </Field>
            <Field label="Article URL">
              <input className={inputCls} value={form.article_url} onChange={set("article_url")} placeholder="https://…" />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button className={btnPrimary} onClick={submit} disabled={loading}>
            {loading ? "Saving…" : "Save Question + Options"}
          </button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <SectionHeader title="Questions in Test" />
          <select className={cx(inputCls, "w-64")} value={selectedTest}
            onChange={(e) => setSelectedTest(e.target.value)}>
            <option value="">Select test to preview</option>
            {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        {!selectedTest ? <EmptyState message="Select a test to view questions" /> :
          questions.length === 0 ? <EmptyState message="No questions yet for this test" /> : (
            <div className="divide-y divide-slate-100">
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-start gap-3 py-3.5">
                  <span className="mt-0.5 w-5 shrink-0 text-xs font-semibold text-slate-400">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-sm text-slate-800">{q.question_text}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {q.subject && <Badge color="blue">{q.subject}</Badge>}
                      <Badge color={diffColor[q.difficulty] ?? "gray"}>{q.difficulty}</Badge>
                      <span className="text-xs text-slate-400">{q.marks} marks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 4 — COUPONS
// ═══════════════════════════════════════════════════════════════════════════
interface CouponForm {
  code: string; discount_type: "flat" | "percent"; discount_value: string;
  max_uses: string; valid_from: string; valid_until: string;
  min_amount: string; is_active: boolean;
}

const defaultCouponForm: CouponForm = {
  code: "", discount_type: "flat", discount_value: "",
  max_uses: "", valid_from: "", valid_until: "", min_amount: "", is_active: true
};

function Coupons({ toast }: { toast: ToastAPI }) {
  const [form, setForm] = useState<CouponForm>(defaultCouponForm);
  const [loading, setLoading] = useState(false);
  const { data: coupons, loading: fetching, setData: setCoupons, refetch } = useFetch<Coupon>("/coupons");

  const set = <K extends keyof CouponForm>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: (e.target as HTMLInputElement).type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async () => {
    if (!form.code || !form.discount_value) return toast.error("Code and discount value required");
    setLoading(true);
    try {
      await api.post("/coupons", {
        ...form,
        discount_value: parseFloat(form.discount_value),
        max_uses: parseInt(form.max_uses) || 100,
        min_amount: parseFloat(form.min_amount) || 0,
      });
      toast.success("Coupon created!");
      setForm(defaultCouponForm);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (id: string, current: boolean) => {
    try {
      await api.patch(`/coupons/${id}`, { is_active: !current });
      setCoupons((p) => p.map((c) => (c.id === id ? { ...c, is_active: !current } : c)));
      toast.success(`Coupon ${!current ? "activated" : "deactivated"}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete coupon?")) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons((p) => p.filter((c) => c.id !== id));
      toast.success("Deleted");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Coupons" subtitle="Create and manage discount coupons" />
      <Card>
        <SectionHeader title="Create Coupon" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Coupon Code *">
            <input className={inputCls} value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="LAUNCH50" />
          </Field>
          <Field label="Discount Type">
            <select className={inputCls} value={form.discount_type} onChange={set("discount_type")}>
              <option value="flat">Flat (₹)</option>
              <option value="percent">Percent (%)</option>
            </select>
          </Field>
          <Field label="Discount Value *">
            <input className={inputCls} type="number" value={form.discount_value} onChange={set("discount_value")}
              placeholder={form.discount_type === "flat" ? "50" : "20"} />
          </Field>
          <Field label="Max Uses">
            <input className={inputCls} type="number" value={form.max_uses} onChange={set("max_uses")} placeholder="500" />
          </Field>
          <Field label="Min Amount (₹)">
            <input className={inputCls} type="number" value={form.min_amount} onChange={set("min_amount")} placeholder="499" />
          </Field>
          <Field label="Valid From">
            <input className={inputCls} type="date" value={form.valid_from} onChange={set("valid_from")} />
          </Field>
          <Field label="Valid Until">
            <input className={inputCls} type="date" value={form.valid_until} onChange={set("valid_until")} />
          </Field>
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={form.is_active} onChange={set("is_active")} />
          Active
        </label>
        <div className="mt-5 flex justify-end">
          <button className={btnPrimary} onClick={submit} disabled={loading}>
            {loading ? "Creating…" : "Create Coupon"}
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="All Coupons" />
        {fetching ? <Spinner /> : coupons.length === 0 ? <EmptyState message="No coupons yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Code", "Discount", "Uses", "Valid Until", "Status", "Actions"].map((h, i) => (
                    <th key={h} className={cx("py-2 px-2 text-xs font-semibold text-slate-500", i === 5 ? "text-right" : "text-left")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2 font-mono font-bold text-slate-900">{c.code}</td>
                    <td className="py-3 px-2 text-slate-700">
                      {c.discount_type === "flat" ? `₹${c.discount_value}` : `${c.discount_value}%`}
                    </td>
                    <td className="py-3 px-2 text-slate-600">{c.used_count ?? 0} / {c.max_uses}</td>
                    <td className="py-3 px-2 text-slate-600">
                      {c.valid_until ? new Date(c.valid_until).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <Badge color={c.is_active ? "green" : "gray"}>{c.is_active ? "active" : "inactive"}</Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className={btnSecondary + " !py-1 !px-2 !text-xs"}
                          onClick={() => toggle(c.id, c.is_active)}>
                          {c.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button className={btnDanger} onClick={() => remove(c.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE 5 — PURCHASES
// ═══════════════════════════════════════════════════════════════════════════
const purchaseStatusColor: Record<string, BadgeColor> = {
  success: "green", pending: "yellow", failed: "red", refunded: "gray"
};

function StudentPurchases({ toast }: { toast: ToastAPI }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { data: purchases, loading: fetching, setData: setPurchases } = useFetch<Purchase>("/purchases");

  const refund = async (id: string) => {
    if (!window.confirm("Mark as refunded?")) return;
    try {
      await api.patch(`/purchases/${id}`, { payment_status: "refunded" });
      setPurchases((p) => p.map((x) => (x.id === id ? { ...x, payment_status: "refunded" } : x)));
      toast.success("Marked as refunded");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const activate = async (id: string) => {
    try {
      await api.patch(`/purchases/${id}`, { payment_status: "success" });
      setPurchases((p) => p.map((x) => (x.id === id ? { ...x, payment_status: "success" } : x)));
      toast.success("Manually activated");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = purchases.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (p.user?.name ?? "").toLowerCase().includes(q) ||
      (p.user?.email ?? "").toLowerCase().includes(q) ||
      (p.payment_id ?? "").toLowerCase().includes(q);
    return matchSearch && (!statusFilter || p.payment_status === statusFilter);
  });

  const revenue = purchases
    .filter((p) => p.payment_status === "success")
    .reduce((s, p) => s + Number(p.amount_paid || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Student Purchases" subtitle="View and manage all transactions" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Orders" value={purchases.length} color="border-slate-200 bg-slate-50 text-slate-800" />
        <StatCard label="Successful" value={purchases.filter((p) => p.payment_status === "success").length}
          color="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <StatCard label="Pending" value={purchases.filter((p) => p.payment_status === "pending").length}
          color="border-amber-200 bg-amber-50 text-amber-800" />
        <StatCard label="Revenue" value={`₹${revenue.toLocaleString("en-IN")}`}
          color="border-indigo-200 bg-indigo-50 text-indigo-800" />
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input className={cx(inputCls, "flex-1")} placeholder="Search by name, email or payment ID…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={cx(inputCls, "sm:w-40")} value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All status</option>
            {["success", "pending", "failed", "refunded"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {fetching ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No purchases found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Student", "Type", "Amount", "Payment ID", "Date", "Status", "Actions"].map((h, i) => (
                    <th key={h} className={cx("py-2 px-2 text-xs font-semibold text-slate-500", i === 6 ? "text-right" : "text-left")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-2">
                      <p className="font-semibold text-slate-900">{p.user?.name ?? p.user_id}</p>
                      <p className="text-xs text-slate-500">{p.user?.email ?? ""}</p>
                    </td>
                    <td className="py-3 px-2">
                      <Badge color={p.purchase_type === "series" ? "blue" : "purple"}>{p.purchase_type}</Badge>
                    </td>
                    <td className="py-3 px-2 font-semibold text-slate-900">
                      ₹{Number(p.amount_paid).toLocaleString("en-IN")}
                      {(p.discount_applied ?? 0) > 0 && (
                        <span className="ml-1 text-xs text-slate-400">(-₹{p.discount_applied})</span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-mono text-xs text-slate-600">{p.payment_id ?? "—"}</td>
                    <td className="py-3 px-2 text-slate-600">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 px-2">
                      <Badge color={purchaseStatusColor[p.payment_status] ?? "gray"}>{p.payment_status}</Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.payment_status === "pending" && (
                          <button
                            className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                            onClick={() => activate(p.id)}>
                            Activate
                          </button>
                        )}
                        {p.payment_status === "success" && (
                          <button className={btnDanger} onClick={() => refund(p.id)}>Refund</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NAV + ROOT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════
type PageId = "series" | "tests" | "questions" | "coupons" | "purchases";

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { id: "series",    label: "Test Series",  icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" },
  { id: "tests",     label: "Tests",        icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { id: "questions", label: "Questions",    icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "coupons",   label: "Coupons",      icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
  { id: "purchases", label: "Purchases",    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
];

const PAGES: Record<PageId, React.ComponentType<{ toast: ToastAPI }>> = {
  series:    CreateTestSeries,
  tests:     CreateTest,
  questions: CreateQuestion,
  coupons:   Coupons,
  purchases: StudentPurchases,
};

export default function DikshantAdmin() {
  const [page, setPage] = useState<PageId>("series");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toasts, success, error } = useToast();
  const toast: ToastAPI = { success, error };
  const Page = PAGES[page];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans antialiased">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cx(
        "fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600">
            <span className="text-sm font-black text-white">D</span>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Dikshant IAS</p>
            <p className="text-xs text-slate-400">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {NAV.map((n) => (
            <button key={n.id}
              onClick={() => { setPage(n.id); setSidebarOpen(false); }}
              className={cx(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                page === n.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}>
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={n.icon} />
              </svg>
              {n.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">v2.0.0 · TypeScript</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-5">
          <button className="rounded-lg p-1.5 hover:bg-slate-100 md:hidden"
            onClick={() => setSidebarOpen(true)}>
            <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-900">
            {NAV.find((n) => n.id === page)?.label}
          </span>
          <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            A
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto max-w-4xl">
            <Page toast={toast} />
          </div>
        </main>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}