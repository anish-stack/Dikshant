import { useState, useEffect, useMemo } from "react";
import { Series, SeriesForm } from "../../utils/types";
import { useFetch } from "../../hooks/useFetch";
import api from "../../utils/axiosInstance";
import axios from "axios";
import {
    cx, inputCls, btnPrimary, btnSecondary, btnDanger, btnOutline,
    Field, Card, SectionHeader, PageHeader, Badge, Spinner, EmptyState,
} from "../../components";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";


// ─── helpers ─────────────────────────────────────────────────────────────────
const getTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
        case "prelims": return "blue";
        case "mains": return "purple";
        case "combined": return "green";
        default: return "gray";
    }
};

const getTypeLabel = (type?: string) => {
    switch (type?.toLowerCase()) {
        case "prelims": return "PRELIMS";
        case "mains": return "MAINS";
        case "combined": return "COMBINED";
        default: return "UNKNOWN";
    }
};

// ─── types ────────────────────────────────────────────────────────────────────
const defaultForm: SeriesForm = {
    title: "", slug: "", type: "prelims", description: "",
    total_tests: "", price: "", discount_price: "",
    is_free: false, is_active: true, thumbnail_url: "",
};

type Mode = "list" | "create" | "edit";

type FilterState = {
    search: string;
    type: string;
    isFree: "all" | "free" | "paid";
    isActive: "all" | "active" | "inactive";
};

interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone?: string;
}

interface AssignForm {
    user_id: string;
    series_id: string;
    test_id: string;
    purchase_type: "free" | "paid" | "manual";
}

// ─── main component ───────────────────────────────────────────────────────────
export default function TestSeriesPage() {
    const [mode, setMode] = useState<Mode>("list");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<SeriesForm>(defaultForm);
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        search: "", type: "", isFree: "all", isActive: "all",
    });

    // ── assign modal state ──
    const [assignOpen, setAssignOpen] = useState(false);
    const [assignTarget, setAssignTarget] = useState<Series | null>(null);
    const [assignForm, setAssignForm] = useState<AssignForm>({
        user_id: "", series_id: "", test_id: "", purchase_type: "manual",
    });
    const [assignLoading, setAssignLoading] = useState(false);

    // user search in modal
    const [userSearch, setUserSearch] = useState("");
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [userPage, setUserPage] = useState(1);
    const [userFetching, setUserFetching] = useState(false);
    const itemsPerPage = 8;

    const { data, loading: fetching, setData: setSeries } = useFetch<Series>("/new/test-series");
    const allSeries = data?.series ?? (Array.isArray(data) ? data : []);

    const filteredSeries = useMemo(() => {
        return allSeries
            .filter((s) => {
                const matchesSearch = !filters.search ||
                    s.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                    s.slug.toLowerCase().includes(filters.search.toLowerCase());
                const matchesType = !filters.type || s.type === filters.type;
                const matchesFree =
                    filters.isFree === "all" ||
                    (filters.isFree === "free" && s.is_free) ||
                    (filters.isFree === "paid" && !s.is_free);
                const matchesActive =
                    filters.isActive === "all" ||
                    (filters.isActive === "active" && s.is_active) ||
                    (filters.isActive === "inactive" && !s.is_active);
                return matchesSearch && matchesType && matchesFree && matchesActive;
            })
            .sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }, [allSeries, filters]);

    useEffect(() => {
        if (mode === "create") {
            setForm(defaultForm);
            setThumbnailFile(null);
            setEditingId(null);
        }
    }, [mode]);

    // ── fetch users for assign modal ──────────────────────────────────────────
    const fetchUsers = async (search: string, pageNum: number) => {
        setUserFetching(true);
        try {
            const params: Record<string, any> = { limit: itemsPerPage, page: pageNum };
            if (search) params.search = search;
            const res = await api.get(`/auth/all-profile`, { params });
            setUsers(res.data.data ?? []);
            setTotalPages(res.data.totalPages ?? 1);
            setTotalUsers(res.data.total ?? 0);
            setUserPage(res.data.page ?? 1);
        } catch {
            toast.error("Failed to load users");
        } finally {
            setUserFetching(false);
        }
    };

    useEffect(() => {
        if (!assignOpen) return;
        const t = setTimeout(() => {
            fetchUsers(userSearch, 1);
            setUserPage(1);
        }, 300);
        return () => clearTimeout(t);
    }, [userSearch, assignOpen]);

    // ── open assign modal ─────────────────────────────────────────────────────
    const openAssign = (series: Series) => {
        setAssignTarget(series);
        setAssignForm({ user_id: "", series_id: series.id, test_id: "", purchase_type: "manual" });
        setUserSearch("");
        setUsers([]);
        setAssignOpen(true);
        fetchUsers("", 1);
    };

    const closeAssign = () => {
        setAssignOpen(false);
        setAssignTarget(null);
        setAssignForm({ user_id: "", series_id: "", test_id: "", purchase_type: "manual" });
        setUserSearch("");
        setUsers([]);
    };

    // ── submit assign ─────────────────────────────────────────────────────────
    const submitAssign = async () => {
        if (!assignForm.user_id) return toast.error("Select user");
        if (!assignForm.series_id) return toast.error("Series missing");

        setAssignLoading(true);
        try {
            await api.post("/new/admin/assign-series", {
                user_id: assignForm.user_id,
                series_id: assignForm.series_id,
                ...(assignForm.test_id && { test_id: assignForm.test_id }),
                purchase_type: assignForm.purchase_type,
            });
            toast.success("Series assigned successfully!");
            closeAssign();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Assign failed");
        } finally {
            setAssignLoading(false);
        }
    };

    // ── form handlers ─────────────────────────────────────────────────────────
    const handleInputChange = <K extends keyof SeriesForm>(key: K) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const value = (e.target as HTMLInputElement).type === "checkbox"
                ? (e.target as HTMLInputElement).checked
                : e.target.value;
            setForm((prev) => {
                const next = { ...prev, [key]: value };
                if (key === "is_free" && value === true) {
                    next.price = "";
                    next.discount_price = "";
                }
                return next;
            });
        };

    const autoGenerateSlug = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        const slug = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        setForm((prev) => ({ ...prev, title, slug }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setThumbnailFile(e.target.files[0]);
    };

    const loadForEdit = (series: Series) => {
        setForm({
            title: series.title, slug: series.slug, type: series.type,
            description: series.description || "",
            total_tests: series.total_tests?.toString() || "",
            price: series.price?.toString() || "",
            discount_price: series.discount_price?.toString() || "",
            is_free: series.is_free || false,
            is_active: series.is_active !== false,
            thumbnail_url: series.thumbnail_url || "",
        });
        setEditingId(series.id);
        setThumbnailFile(null);
        setMode("edit");
    };

    const refreshList = async () => {
        const res = await api.get("/new/test-series");
        const fresh = res.data;
        setSeries(Array.isArray(fresh) ? fresh : fresh?.data?.series || fresh?.data || []);
    };

    const submitForm = async () => {
        if (!form.title?.trim()) return toast.error("Title required");
        if (!form.type) return toast.error("Type required");
        if (!form.is_free && (!form.price || parseFloat(form.price) <= 0))
            return toast.error("Price required for paid series");

        setLoading(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([k, v]) => {
                if (v !== null && v !== undefined && v !== "") formData.append(k, String(v));
            });
            if (thumbnailFile) formData.append("thumbnail", thumbnailFile);

            const isEdit = mode === "edit" && editingId;
            await api({
                method: isEdit ? "put" : "post",
                url: isEdit ? `/new/test-series/${editingId}` : "/new/test-series",
                data: formData,
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success(isEdit ? "Series updated!" : "Series created!");
            await refreshList();
            setForm(defaultForm);
            setThumbnailFile(null);
            setMode("list");
            setEditingId(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const deleteSeries = async (id: string) => {
        if (!window.confirm("Delete this series?")) return;
        try {
            await api.delete(`/new/test-series/${id}`);
            toast.success("Deleted");
            await refreshList();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Delete failed");
        }
    };

    const cancelForm = () => {
        setMode("list");
        setForm(defaultForm);
        setThumbnailFile(null);
        setEditingId(null);
    };

    const resetFilters = () =>
        setFilters({ search: "", type: "", isFree: "all", isActive: "all" });

    // ─── render ───────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <PageHeader
                title="Test Series"
                subtitle="Create and manage UPSC Prelims & Mains test series"
            />

            {/* Quick Nav */}
            <div className="flex gap-3">
                <Link to="/new-testsPage" className={btnSecondary}>Manage Tests</Link>
                <Link to="/new-questions" className={btnSecondary}>Manage Questions</Link>
            </div>

            {/* ── Create / Edit Form ─────────────────────────────────────── */}
            {(mode === "create" || mode === "edit") && (
                <Card>
                    <SectionHeader title={mode === "create" ? "Create New Test Series" : "Edit Test Series"} />
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field label="Series Title *">
                            <input className={inputCls} value={form.title}
                                onChange={autoGenerateSlug}
                                placeholder="UPSC Prelims 2025 Full Mock Series" />
                        </Field>
                        <Field label="Slug">
                            <input className={inputCls} value={form.slug}
                                onChange={handleInputChange("slug")}
                                placeholder="upsc-prelims-2025" />
                        </Field>
                        <Field label="Type *">
                            <select className={inputCls} value={form.type} onChange={handleInputChange("type")}>
                                <option value="prelims">Prelims</option>
                                <option value="mains">Mains</option>
                                <option value="combined">Combo</option>
                            </select>
                        </Field>
                        <Field label="Total Tests">
                            <input type="number" className={inputCls} value={form.total_tests}
                                onChange={handleInputChange("total_tests")} placeholder="25" />
                        </Field>
                        <div className="md:col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={form.is_free}
                                    onChange={handleInputChange("is_free")}
                                    className="h-5 w-5 rounded border-slate-300 text-indigo-600" />
                                <span className="text-lg font-medium text-slate-700">
                                    This is a <strong>Free Series</strong>
                                </span>
                            </label>
                        </div>
                        {!form.is_free && (
                            <>
                                <Field label="Price (₹) *">
                                    <input type="number" className={inputCls} value={form.price}
                                        onChange={handleInputChange("price")} placeholder="999" min="0" />
                                </Field>
                                <Field label="Discount Price (₹)">
                                    <input type="number" className={inputCls} value={form.discount_price}
                                        onChange={handleInputChange("discount_price")} placeholder="799" min="0" />
                                </Field>
                            </>
                        )}
                        <Field label="Thumbnail Image">
                            <input type="file" accept="image/*" onChange={handleFileChange}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                            {form.thumbnail_url && !thumbnailFile && (
                                <p className="text-xs text-slate-500 mt-1.5">
                                    Current: {form.thumbnail_url.split("/").pop()}
                                </p>
                            )}
                        </Field>
                        <Field label="Description" className="md:col-span-2">
                            <textarea className={cx(inputCls, "resize-none")} rows={4}
                                value={form.description} onChange={handleInputChange("description")}
                                placeholder="Brief description about this test series..." />
                        </Field>
                    </div>
                    <div className="mt-6">
                        <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" checked={form.is_active}
                                onChange={handleInputChange("is_active")} className="h-4 w-4 rounded" />
                            <span>Mark as Active</span>
                        </label>
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <button onClick={cancelForm} className={btnSecondary}>Cancel</button>
                        <button onClick={submitForm} disabled={loading} className={btnPrimary}>
                            {loading
                                ? (mode === "create" ? "Creating..." : "Updating...")
                                : (mode === "create" ? "Create Series" : "Update Series")}
                        </button>
                    </div>
                </Card>
            )}

            {/* ── List View ─────────────────────────────────────────────── */}
            {mode === "list" && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">All Test Series</h2>
                            <p className="text-sm text-slate-500">
                                {filteredSeries.length} of {allSeries.length} series
                            </p>
                        </div>
                        <button onClick={() => setMode("create")} className={btnPrimary}>
                            + Create New Series
                        </button>
                    </div>

                    <Card>
                        {/* Filters */}
                        <div className="p-5 border-b bg-slate-50 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[240px]">
                                <input type="text" placeholder="Search by title or slug..."
                                    className={inputCls} value={filters.search}
                                    onChange={(e) => setFilters(p => ({ ...p, search: e.target.value }))} />
                            </div>
                            <Field label="Type" className="w-44">
                                <select className={inputCls} value={filters.type}
                                    onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))}>
                                    <option value="">All Types</option>
                                    <option value="prelims">Prelims</option>
                                    <option value="mains">Mains</option>
                                    <option value="combined">Combined</option>
                                </select>
                            </Field>
                            <Field label="Free/Paid" className="w-40">
                                <select className={inputCls} value={filters.isFree}
                                    onChange={(e) => setFilters(p => ({ ...p, isFree: e.target.value as any }))}>
                                    <option value="all">All</option>
                                    <option value="free">Free Only</option>
                                    <option value="paid">Paid Only</option>
                                </select>
                            </Field>
                            <Field label="Status" className="w-40">
                                <select className={inputCls} value={filters.isActive}
                                    onChange={(e) => setFilters(p => ({ ...p, isActive: e.target.value as any }))}>
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </Field>
                            <button onClick={resetFilters} className={btnOutline}>Reset Filters</button>
                        </div>

                        {/* Series Rows */}
                        {fetching ? (
                            <Spinner />
                        ) : filteredSeries.length === 0 ? (
                            <EmptyState message="No series found matching your filters" />
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredSeries.map((s: any) => (
                                    <div key={s.id} className="py-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <p className="font-semibold text-slate-900">{s.title}</p>
                                                <Badge color={getTypeColor(s.type)}>{getTypeLabel(s.type)}</Badge>
                                                {s.is_free && <Badge color="emerald">FREE</Badge>}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {s.slug} • {s.total_tests || 0} tests
                                                {!s.is_free && ` • ₹${s.price}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge color={s.is_active ? "green" : "gray"}>
                                                {s.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                            {/* ← Assign button */}
                                            <button
                                                onClick={() => openAssign(s)}
                                                className={btnOutline}
                                                title="Assign to user"
                                            >
                                                Assign
                                            </button>
                                            <button onClick={() => loadForEdit(s)} className={btnSecondary}>Edit</button>
                                            <button onClick={() => deleteSeries(s.id)} className={btnDanger}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </>
            )}

            {/* ── Assign Modal ───────────────────────────────────────────── */}
            {assignOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <div>
                                <h2 className="text-lg font-semibold">Assign Series to User</h2>
                                {assignTarget && (
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {assignTarget.title}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={closeAssign}
                                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Purchase type */}
                            <Field label="Purchase Type">
                                <select
                                    className={inputCls}
                                    value={assignForm.purchase_type}
                                    onChange={(e) =>
                                        setAssignForm(p => ({ ...p, purchase_type: e.target.value as any }))
                                    }
                                >
                                    <option value="manual">Manual (Admin Grant)</option>
                                    <option value="free">Free</option>
                                    <option value="paid">Paid</option>
                                </select>
                            </Field>

                            {/* Optional test_id */}
                            <Field label="Test ID (optional)">
                                <input
                                    className={inputCls}
                                    value={assignForm.test_id}
                                    onChange={(e) => setAssignForm(p => ({ ...p, test_id: e.target.value }))}
                                    placeholder="Leave blank to assign whole series"
                                />
                            </Field>

                            {/* User search */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Search & Select User *
                                </label>
                                <input
                                    type="text"
                                    className={inputCls}
                                    placeholder="Search by name or email..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                />
                            </div>

                            {/* User list */}
                            <div className="border rounded-xl overflow-hidden">
                                {userFetching ? (
                                    <div className="p-6 flex justify-center"><Spinner /></div>
                                ) : users.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-slate-400">No users found</div>
                                ) : (
                                    <div className="divide-y max-h-64 overflow-y-auto">
                                        {users.map((u) => (
                                            <label
                                                key={u.id}
                                                className={cx(
                                                    "flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors",
                                                    assignForm.user_id === u.id && "bg-indigo-50"
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name="assign_user"
                                                    value={u.id}
                                                    checked={assignForm.user_id === u.id}
                                                    onChange={() => setAssignForm(p => ({ ...p, user_id: u.id }))}
                                                    className="h-4 w-4 text-indigo-600"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{u.name}</p>
                                                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                                </div>
                                                {u.phone && (
                                                    <span className="text-xs text-slate-400 shrink-0">{u.phone}</span>
                                                )}
                                                {assignForm.user_id === u.id && (
                                                    <Badge color="indigo">Selected</Badge>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between text-sm text-slate-500">
                                    <span>{totalUsers} users total</span>
                                    <div className="flex gap-2">
                                        <button
                                            className={btnOutline}
                                            disabled={userPage <= 1 || userFetching}
                                            onClick={() => {
                                                const p = userPage - 1;
                                                setUserPage(p);
                                                fetchUsers(userSearch, p);
                                            }}
                                        >
                                            ← Prev
                                        </button>
                                        <span className="self-center">
                                            {userPage} / {totalPages}
                                        </span>
                                        <button
                                            className={btnOutline}
                                            disabled={userPage >= totalPages || userFetching}
                                            onClick={() => {
                                                const p = userPage + 1;
                                                setUserPage(p);
                                                fetchUsers(userSearch, p);
                                            }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-slate-50">
                            <button onClick={closeAssign} className={btnSecondary}>Cancel</button>
                            <button
                                onClick={submitAssign}
                                disabled={assignLoading || !assignForm.user_id}
                                className={btnPrimary}
                            >
                                {assignLoading ? "Assigning..." : "Assign Series"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}