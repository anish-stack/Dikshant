import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Play,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  Link2,
  ImageIcon,
  Calendar,
  Clock,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  ChevronsLeft,
  ChevronsRight,
  Radio,
  Film,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  StopCircle,
  Users,
  BarChart2,
  Share2,
  Video,
  ChevronDown,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../../utils/axiosInstance";
import toast from "react-hot-toast";

const API_URL = "https://www.app.api.dikshantias.com/api/videocourses";
const BATCHS_API = "https://www.app.api.dikshantias.com/api/batchs";

interface Subject {
  id: number;
  name: string;
}

interface VideoItem {
  id: number;
  title: string;
  imageUrl: string;
  videoSource: "youtube" | "s3" | "vimeo";
  url: string;
  subjectId: number;
  isDownloadable: boolean;
  position: number;
  isDemo: boolean;
  status: "active" | "inactive";
  batchId: number;
  isLive?: boolean;
  dateOfClass: string;
  TimeOfClass: string;
  DateOfLive?: string;
  TimeOfLIve?: string;
  isLiveEnded?: boolean;
}

interface FormData {
  title: string;
  videoSource: "youtube" | "s3" | "vimeo";
  url: string;
  isLive: boolean;
  position: number;
  DateOfLive: string;
  TimeOfLIve: string;
  dateOfClass: string;
  TimeOfClass: string;
  subjectId: string;
  isDownloadable: boolean;
  isDemo: boolean;
  status: boolean;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ConfirmConfig {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  icon: React.ReactNode;
  onConfirm: () => void;
}

const LIMIT_OPTIONS = [10, 20, 30, 50, 100];
const getCurrentDate = () => new Date().toISOString().split("T")[0];
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

/* ── Confirm Dialog ────────────────────────────────────────────────────────── */
function ConfirmModal({
  config,
  loading,
  onCancel,
}: {
  config: ConfirmConfig;
  loading: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-[modalIn_0.2s_ease-out]">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-slate-700 flex items-center justify-center">
            {config.icon}
          </div>
          <h3 className="text-lg font-semibold text-white">{config.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{config.message}</p>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={config.onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${config.confirmClass}`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────────────── */
function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${color}`}
    >
      {children}
    </span>
  );
}

/* ── Source Chip ───────────────────────────────────────────────────────────── */
const SOURCE_COLORS: Record<string, string> = {
  youtube: "bg-red-500/15 text-red-400 border border-red-500/20",
  s3: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  vimeo: "bg-sky-500/15 text-sky-400 border border-sky-500/20",
};

/* ─────────────────────────────────────────────────────────────────────────── */

export default function CourseVideos() {
  const { id } = useParams<{ id: string }>();
  const batchId = id ? Number(id) : null;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialPage = Number(searchParams.get("page")) || 1;
  const initialLimit = Number(searchParams.get("limit")) || 10;
  const initialSearch = searchParams.get("search") || "";

  const [batch, setBatch] = useState<any>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: initialPage,
    limit: initialLimit,
    totalPages: 1,
  });

  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "recorded" | "demo">("all");
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [playing, setPlaying] = useState<VideoItem | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    title: "",
    videoSource: "youtube",
    url: "",
    isLive: false,
    DateOfLive: getCurrentDate(),
    TimeOfLIve: getCurrentTime(),
    position: 0,
    dateOfClass: "",
    TimeOfClass: "",
    subjectId: "",
    isDownloadable: false,
    isDemo: false,
    status: true,
  });

  /* ── URL sync ── */
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());
    if (search.trim()) params.set("search", search.trim());
    setSearchParams(params, { replace: true });
  }, [pagination.page, pagination.limit, search, setSearchParams]);

  /* ── Fetch ── */
  const fetchVideos = useCallback(async () => {
    if (!batchId) return;
    try {
      setLoading(true);
      setError(false);
      const params: any = {
        admin: true,
        page: pagination.page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        subjectId: subjectFilter || undefined,
        date: dateFilter || undefined,
      };
      const [videoRes, batchRes] = await Promise.all([
        axios.get(`${API_URL}/batch/${batchId}`, { params }),
        axios.get(`${BATCHS_API}/${batchId}`),
      ]);
      setBatch(batchRes.data);
      setVideos(videoRes.data.data || []);
      setSubjects(batchRes.data.subjects || []);
      if (videoRes.data.pagination) {
        setPagination((prev) => ({
          ...prev,
          ...videoRes.data.pagination,
        }));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [batchId, pagination.page, pagination.limit, search, statusFilter, subjectFilter, dateFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, statusFilter, subjectFilter, dateFilter, typeFilter]);

  /* ── Client filter by type ── */
  const filteredVideos = videos.filter((v) => {
    if (typeFilter === "live") return v.isLive;
    if (typeFilter === "demo") return v.isDemo;
    if (typeFilter === "recorded") return !v.isLive && !v.isDemo;
    return true;
  });

  /* ── Confirm helpers ── */
  function askConfirm(cfg: ConfirmConfig) {
    setConfirmConfig(cfg);
  }
  function closeConfirm() {
    setConfirmConfig(null);
    setConfirmLoading(false);
  }

  /* ── Actions ── */
  const openAdd = () => {
    setEditId(null);
    setForm({
      title: "",
      videoSource: "youtube",
      url: "",
      isLive: false,
      DateOfLive: getCurrentDate(),
      TimeOfLIve: getCurrentTime(),
      position: 0,
      dateOfClass: "",
      TimeOfClass: "",
      subjectId: "",
      isDownloadable: false,
      isDemo: false,
      status: true,
    });
    setThumbnail(null);
    setPreview("");
    setShowModal(true);
  };

  const openEdit = (v: VideoItem) => {
    setEditId(v.id);
    setForm({
      title: v.title,
      videoSource: v.videoSource,
      url: v.url,
      position: v.position,
      subjectId: v.subjectId.toString(),
      isDownloadable: v.isDownloadable,
      dateOfClass: v.dateOfClass || "",
      TimeOfClass: v.TimeOfClass || "",
      isDemo: v.isDemo,
      isLive: v.isLive || false,
      DateOfLive: v.DateOfLive || "",
      TimeOfLIve: v.TimeOfLIve || "",
      status: v.status === "active",
    });
    setPreview(v.imageUrl || "");
    setThumbnail(null);
    setShowModal(true);
  };

  const confirmToggleStatus = (v: VideoItem) => {
    const isActive = v.status === "active";
    askConfirm({
      title: isActive ? "Deactivate Video?" : "Activate Video?",
      message: isActive
        ? `"${v.title}" will be hidden from students.`
        : `"${v.title}" will become visible to students.`,
      confirmLabel: isActive ? "Deactivate" : "Activate",
      confirmClass: isActive
        ? "bg-orange-600 hover:bg-orange-700"
        : "bg-emerald-600 hover:bg-emerald-700",
      icon: isActive ? (
        <EyeOff className="w-7 h-7 text-orange-400" />
      ) : (
        <Eye className="w-7 h-7 text-emerald-400" />
      ),
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const newStatus = isActive ? "inactive" : "active";
          await axios.put(`${API_URL}/${v.id}`, { status: newStatus });
          setVideos((prev) =>
            prev.map((item) =>
              item.id === v.id ? { ...item, status: newStatus } : item
            )
          );
          closeConfirm();
        } catch {
          setConfirmLoading(false);
        }
      },
    });
  };

  const confirmDelete = (v: VideoItem) => {
    askConfirm({
      title: "Delete Video?",
      message: `"${v.title}" will be permanently removed. This action cannot be undone.`,
      confirmLabel: "Delete",
      confirmClass: "bg-red-600 hover:bg-red-700",
      icon: <Trash2 className="w-7 h-7 text-red-400" />,
      onConfirm: async () => {
        setConfirmLoading(true);

        try {
          // Make the delete API call
          await api.delete(`/${v.id}`);

          // Optimistically remove from UI
          setVideos((prev) => prev.filter((item) => item.id !== v.id));

          // Show success feedback (optional)
          toast.success("Video deleted successfully");

          closeConfirm();
        } catch (error: any) {
          console.error("Delete failed:", error);

          // Show error message to user
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "Failed to delete video. Please try again.";

          toast.error(errorMessage);

          // Keep confirm modal open on error so user can try again
          // Do NOT call closeConfirm() here
        } finally {
          setConfirmLoading(false);
        }
      },
    });
  };

  const confirmEndLive = (v: VideoItem) => {
    if (v.isLiveEnded) return;
    askConfirm({
      title: "End Live Session?",
      message: `This will permanently end the live session for "${v.title}". Students will no longer be able to join.`,
      confirmLabel: "End Live",
      confirmClass: "bg-rose-600 hover:bg-rose-700",
      icon: <StopCircle className="w-7 h-7 text-rose-400" />,
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          await axios.put(`${API_URL}/${v.id}`, { isLiveEnded: true });
          setVideos((prev) =>
            prev.map((item) =>
              item.id === v.id ? { ...item, isLiveEnded: true } : item
            )
          );
          closeConfirm();
        } catch {
          setConfirmLoading(false);
        }
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.isLive && (!form.DateOfLive || !form.TimeOfLIve)) {
      alert("Please set date and time for live video");
      return;
    }
    if (!batchId) return;
    const data = new FormData();
    data.append("title", form.title);
    data.append("videoSource", form.videoSource);
    data.append("url", form.url);
    data.append("batchId", String(batchId));
    data.append("position", String(form.position));
    data.append("subjectId", form.subjectId);
    data.append("isDownloadable", String(form.isDownloadable));
    data.append("isDemo", String(form.isDemo));
    data.append("isLive", String(form.isLive));
    data.append("status", form.status ? "active" : "inactive");
    if (form.isLive) {
      data.append("DateOfLive", form.DateOfLive);
      data.append("TimeOfLIve", form.TimeOfLIve);
    }
    data.append("dateOfClass", form.dateOfClass);
    data.append("TimeOfClass", form.TimeOfClass);
    if (thumbnail) data.append("imageUrl", thumbnail);
    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(API_URL, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setShowModal(false);
      fetchVideos();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save video");
    }
  };

  const getYTEmbed = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const renderPlayer = (v: VideoItem) => {
    if (v.videoSource === "youtube") {
      const embed = getYTEmbed(v.url);
      return embed ? (
        <iframe src={embed} className="w-full h-full" allowFullScreen title={v.title} />
      ) : (
        <div className="flex items-center justify-center h-full text-red-400 text-sm">
          Invalid YouTube URL
        </div>
      );
    }
    return <video src={v.url} controls className="w-full h-full" />;
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).jumpPage as HTMLInputElement;
    const pageNum = Number(input.value);
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: pageNum }));
    }
  };

  const activeFilterCount = [
    statusFilter !== "all",
    typeFilter !== "all",
    !!subjectFilter,
    !!dateFilter,
  ].filter(Boolean).length;

  if (!batchId)
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
        Invalid batch ID
      </div>
    );

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .row-anim { animation: fadeIn 0.2s ease-out both; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                Course Videos
                <span className="ml-2 text-slate-500 font-normal text-sm">
                  Batch #{batchId}
                </span>
              </h1>
            </div>
            {pagination.total > 0 && (
              <p className="text-xs text-slate-500 mt-0.5 ml-10">
                {pagination.total} videos total
              </p>
            )}
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/40"
          >
            <Plus className="w-4 h-4" />
            Add Video
          </button>
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-800 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-500 outline-none transition-colors"
            />
          </div>

          {/* Show per page */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500">Show</span>
            <select
              value={pagination.limit}
              onChange={(e) =>
                setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }))
              }
              className="px-3 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
            >
              {LIMIT_OPTIONS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${showFilters || activeFilterCount > 0
              ? "bg-indigo-600/20 border-indigo-500 text-indigo-400"
              : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
              }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700 animate-[fadeIn_0.15s_ease-out]">
            {/* Status */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-700 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-slate-700 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-500"
              >
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="recorded">Recorded</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-700 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-500"
              >
                <option value="">All</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-700 border border-slate-600 rounded-lg text-white outline-none focus:border-indigo-500"
              />
            </div>

            {activeFilterCount > 0 && (
              <div className="col-span-2 sm:col-span-4 flex justify-end">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setTypeFilter("all");
                    setSubjectFilter("");
                    setDateFilter("");
                  }}
                  className="text-xs text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Type Quick Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {(["all", "live", "recorded", "demo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${typeFilter === t
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700"
                }`}
            >
              {t === "all" ? "All Videos" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 pb-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading videos...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-slate-400 text-sm">Failed to load videos.</p>
            <button
              onClick={fetchVideos}
              className="mt-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-sm rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            {/* Desktop Table */}
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  {batch?.category === "recorded" && (
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      #
                    </th>
                  )}
                  <tr className="border-b border-slate-800 bg-slate-800/60">
                    {["Video", "Subject", "Source", "Schedule", "Type", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredVideos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center">
                            <Film className="w-7 h-7 text-slate-600" />
                          </div>
                          <p className="text-slate-500 text-sm">
                            {search ? "No matching videos found" : "No videos yet"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredVideos.map((v, i) => (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-800/40 transition-colors row-anim"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        {batch?.category === "recorded" && (
                          <td className="px-4 py-3">
                            <span className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                              {v.position || 0}
                            </span>
                          </td>
                        )}
                        {/* Title */}
                        <td className="px-4 py-3 min-w-[200px] max-w-[280px]">
                          <div className="flex items-start gap-3">
                            {v.imageUrl ? (
                              <img
                                src={v.imageUrl}
                                alt={v.title}
                                className="w-12 h-8 object-cover rounded-md shrink-0 border border-slate-700"
                              />
                            ) : (
                              <div className="w-12 h-8 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white text-xs leading-snug line-clamp-2">
                                {v.title}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {v.isDownloadable && (
                                  <Badge color="bg-blue-500/15 text-blue-400">DL</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-slate-400">
                            {subjects.find((s) => s.id === v.subjectId)?.name || "—"}
                          </span>
                        </td>

                        {/* Source */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${SOURCE_COLORS[v.videoSource]}`}>
                            {v.videoSource}
                          </span>
                        </td>

                        {/* Schedule */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {(v.isLive && v.DateOfLive && v.TimeOfLIve) ? (
                            <div className="text-xs text-slate-400 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-purple-400" />
                                {v.DateOfLive.replace(/-/g, "/")}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-purple-400" />
                                {v.TimeOfLIve.slice(0, 5)}
                              </div>
                            </div>
                          ) : (v.dateOfClass && v.TimeOfClass) ? (
                            <div className="text-xs text-slate-400 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {v.dateOfClass.replace(/-/g, "/")}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {v.TimeOfClass.slice(0, 5)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Type badges */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {v.isLive && !v.isLiveEnded && (
                              <Badge color="bg-purple-500/15 text-purple-400 border border-purple-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                Live
                              </Badge>
                            )}
                            {v.isLiveEnded && (
                              <Badge color="bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                Ended
                              </Badge>
                            )}
                            {v.isDemo && (
                              <Badge color="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                Demo
                              </Badge>
                            )}
                            {!v.isLive && !v.isLiveEnded && !v.isDemo && (
                              <Badge color="bg-slate-700 text-slate-400">
                                Recorded
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          {v.status === "active" ? (
                            <Badge color="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </Badge>
                          ) : (
                            <Badge color="bg-slate-700 text-slate-500 border border-slate-600">
                              <XCircle className="w-3 h-3" /> Inactive
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center flex-wrap gap-1.5">
                            {/* Play */}
                            <ActionBtn
                              title="Play"
                              color="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400"
                              onClick={() => setPlaying(v)}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </ActionBtn>

                            {/* Edit */}
                            <ActionBtn
                              title="Edit"
                              color="bg-sky-500/15 hover:bg-sky-500/25 text-sky-400"
                              onClick={() => openEdit(v)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </ActionBtn>

                            {/* Toggle Status */}
                            <ActionBtn
                              title={v.status === "active" ? "Deactivate" : "Activate"}
                              color="bg-amber-500/15 hover:bg-amber-500/25 text-amber-400"
                              onClick={() => confirmToggleStatus(v)}
                            >
                              {v.status === "active" ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </ActionBtn>

                            {/* Delete */}
                            <ActionBtn
                              title="Delete"
                              color="bg-red-500/15 hover:bg-red-500/25 text-red-400"
                              onClick={() => confirmDelete(v)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </ActionBtn>

                            {/* Upload PDF */}
                            <ActionBtn
                              title="Upload PDF"
                              color="bg-violet-500/15 hover:bg-violet-500/25 text-violet-400"
                              onClick={() =>
                                navigate(
                                  `/upload-pdf?batch=${batchId}&video=${v.id}&title=${encodeURIComponent(
                                    v.title.trim().toLowerCase().replace(/\s+/g, "-")
                                  )}`
                                )
                              }
                            >
                              <Upload className="w-3.5 h-3.5" />
                            </ActionBtn>

                            {/* View Comments */}
                            <ActionBtn
                              title="Comments"
                              color="bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400"
                              onClick={() => navigate(`/view-comments-joined/${v.id}`)}
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </ActionBtn>

                            {/* Live-only actions */}
                            {v.isLive && (
                              <>
                                <ActionBtn
                                  title="End Live"
                                  color={v.isLiveEnded
                                    ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                                    : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-400"
                                  }
                                  onClick={() => confirmEndLive(v)}
                                  disabled={v.isLiveEnded}
                                >
                                  <StopCircle className="w-3.5 h-3.5" />
                                </ActionBtn>

                                <ActionBtn
                                  title="View Chats"
                                  color="bg-teal-500/15 hover:bg-teal-500/25 text-teal-400"
                                  onClick={() => navigate(`/view-chat/${v.id}`)}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </ActionBtn>

                                <ActionBtn
                                  title="Students Joined"
                                  color="bg-orange-500/15 hover:bg-orange-500/25 text-orange-400"
                                  onClick={() => navigate(`/view-studnets-joined/${v.id}`)}
                                >
                                  <Users className="w-3.5 h-3.5" />
                                </ActionBtn>

                                <a
                                  href={`/stats-of-class/${v.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Admin Check Live"
                                  className="p-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 transition-colors"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                </a>

                                <a
                                  href={`/live-class-monitor/${v.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title="Share Live Monitor"
                                  className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-colors"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 0 && (
              <div className="px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Showing{" "}
                  <strong className="text-slate-300">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </strong>{" "}
                  –{" "}
                  <strong className="text-slate-300">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </strong>{" "}
                  of <strong className="text-slate-300">{pagination.total}</strong>
                </span>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  <PagBtn
                    onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </PagBtn>
                  <PagBtn
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </PagBtn>

                  <form onSubmit={handleJumpToPage} className="flex items-center gap-1.5">
                    <span className="text-slate-500">Page</span>
                    <input
                      type="number"
                      name="jumpPage"
                      min={1}
                      max={pagination.totalPages}
                      defaultValue={pagination.page}
                      className="w-14 px-2 py-1.5 text-center bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
                    />
                    <span className="text-slate-500">of {pagination.totalPages}</span>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Go
                    </button>
                  </form>

                  <PagBtn
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </PagBtn>
                  <PagBtn
                    onClick={() => setPagination((p) => ({ ...p, page: p.totalPages }))}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </PagBtn>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Video Player Modal ── */}
      {playing && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl animate-[modalIn_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlaying(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 hover:bg-black/90 rounded-full flex items-center justify-center border border-slate-700 transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            <div className="aspect-video">{renderPlayer(playing)}</div>
            <div className="p-4 bg-gradient-to-t from-black to-transparent">
              <p className="font-semibold text-white text-sm">{playing.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {subjects.find((s) => s.id === playing.subjectId)?.name} ·{" "}
                {playing.videoSource.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-[modalIn_0.2s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                  {editId ? <Edit2 className="w-3.5 h-3.5 text-indigo-400" /> : <Plus className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <h2 className="font-semibold text-white text-sm">
                  {editId ? "Edit Video" : "Add Video"}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin"
            >
              {/* Title */}
              <Field label="Title *">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={INPUT_CLS}
                  placeholder="Enter video title"
                  required
                />
              </Field>

              {/* Position */}
              {batch?.category === "recorded" && (
                <Field label="Position *">
                  <input
                    type="number"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) })}
                    className={INPUT_CLS}
                    required
                  />
                </Field>
              )}

              {/* Source + URL row */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Source *">
                  <select
                    value={form.videoSource}
                    onChange={(e) => setForm({ ...form, videoSource: e.target.value as any })}
                    className={INPUT_CLS}
                  >
                    <option value="youtube">YouTube</option>
                    <option value="s3">S3 / Direct</option>
                    <option value="vimeo">Vimeo</option>
                  </select>
                </Field>
                <Field label="Subject *">
                  <select
                    value={form.subjectId}
                    onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                    className={INPUT_CLS}
                    required
                  >
                    <option value="">Select</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* URL */}
              <Field label="URL *">
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className={`${INPUT_CLS} pl-9`}
                    placeholder="https://"
                    required
                  />
                </div>
              </Field>

              {/* Thumbnail */}
              <Field label="Thumbnail">
                {preview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700">
                    <img src={preview} alt="Preview" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setThumbnail(null); setPreview(""); }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 cursor-pointer transition-colors group">
                    <Upload className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-xs text-slate-600 group-hover:text-slate-400 mt-1 transition-colors">
                      Click to upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setThumbnail(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </Field>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "isLive", label: "Live Session", icon: <Radio className="w-3 h-3" /> },
                  { key: "isDemo", label: "Demo", icon: <Layers className="w-3 h-3" /> },
                  { key: "isDownloadable", label: "Downloadable", icon: <Upload className="w-3 h-3" /> },
                  { key: "status", label: "Active", icon: <CheckCircle2 className="w-3 h-3" /> },
                ].map(({ key, label, icon }) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${(form as any)[key]
                      ? "bg-indigo-600/10 border-indigo-500/40 text-indigo-300"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) => {
                        if (key === "isLive") {
                          setForm({
                            ...form,
                            isLive: e.target.checked,
                            DateOfLive: e.target.checked ? form.DateOfLive : "",
                            TimeOfLIve: e.target.checked ? form.TimeOfLIve : "",
                          });
                        } else {
                          setForm({ ...form, [key]: e.target.checked });
                        }
                      }}
                      className="hidden"
                    />
                    <span className="flex-1 text-xs font-medium flex items-center gap-1.5">
                      {icon} {label}
                    </span>
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${(form as any)[key] ? "bg-indigo-600" : "bg-slate-700"}`}>
                      <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${(form as any)[key] ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                  </label>
                ))}
              </div>

              {/* Date/Time for non-live */}
              {!form.isLive && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <Field label="Date of Class *">
                    <input
                      type="date"
                      value={form.dateOfClass}
                      onChange={(e) => setForm({ ...form, dateOfClass: e.target.value })}
                      className={INPUT_CLS}
                      required
                    />
                  </Field>
                  <Field label="Time of Class *">
                    <input
                      type="time"
                      value={form.TimeOfClass}
                      onChange={(e) => setForm({ ...form, TimeOfClass: e.target.value })}
                      className={INPUT_CLS}
                      required
                    />
                  </Field>
                </div>
              )}

              {/* Date/Time for live */}
              {form.isLive && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <Field label="Live Date *">
                    <input
                      type="date"
                      value={form.DateOfLive}
                      onChange={(e) => setForm({ ...form, DateOfLive: e.target.value })}
                      className={INPUT_CLS}
                      required
                    />
                  </Field>
                  <Field label="Live Time *">
                    <input
                      type="time"
                      value={form.TimeOfLIve}
                      onChange={(e) => setForm({ ...form, TimeOfLIve: e.target.value })}
                      className={INPUT_CLS}
                      required
                    />
                  </Field>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/30"
                >
                  {editId ? "Save Changes" : "Add Video"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-sm rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {confirmConfig && (
        <ConfirmModal
          config={confirmConfig}
          loading={confirmLoading}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const INPUT_CLS =
  "w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-white placeholder-slate-500 outline-none transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ActionBtn({
  children,
  title,
  color,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  color: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-colors ${color} disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function PagBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-400"
    >
      {children}
    </button>
  );
}