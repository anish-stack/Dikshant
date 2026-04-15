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
  Filter,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

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

const LIMIT_OPTIONS = [10, 20, 30, 50, 100];

const getCurrentDate = () => new Date().toISOString().split("T")[0];
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

export default function CourseVideos() {
  const { id } = useParams<{ id: string }>();
  const batchId = id ? Number(id) : null;

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [deleteLoading, setDeleteLoading] = useState(false);

  // URL Params
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

  // New Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "recorded" | "demo">("all");

  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteVideo, setDeleteVideo] = useState<VideoItem | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [playing, setPlaying] = useState<VideoItem | null>(null);

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

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", pagination.page.toString());
    params.set("limit", pagination.limit.toString());
    if (search.trim()) params.set("search", search.trim());
    setSearchParams(params, { replace: true });
  }, [pagination.page, pagination.limit, search, setSearchParams]);

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
          total: videoRes.data.pagination.total,
          page: videoRes.data.pagination.page,
          limit: videoRes.data.pagination.limit,
          totalPages: videoRes.data.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [batchId, pagination.page, pagination.limit, search, statusFilter, subjectFilter, dateFilter]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, statusFilter, subjectFilter, dateFilter, typeFilter]);

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

  const toggleStatus = async (v: VideoItem) => {
    const newStatus = v.status === "active" ? "inactive" : "active";
    try {
      await axios.put(`${API_URL}/${v.id}`, { status: newStatus });
      setVideos((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, status: newStatus } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const endLiveSession = async (v: VideoItem) => {
    if (v.isLiveEnded) return;
    try {
      await axios.put(`${API_URL}/${v.id}`, { isLiveEnded: true });
      setVideos((prev) =>
        prev.map((item) => (item.id === v.id ? { ...item, isLiveEnded: true } : item))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const removeVideo = async () => {
    if (!deleteVideo) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`${API_URL}/${deleteVideo.id}`);
      setVideos((prev) => prev.filter((v) => v.id !== deleteVideo.id));
      setDeleteVideo(null);
      fetchVideos();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
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
        <iframe src={embed} className="w-full h-full" allowFullScreen />
      ) : (
        <div className="text-red-400 flex items-center justify-center h-full text-sm">Invalid YouTube URL</div>
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

  // Filter videos by type (client-side for better UX)
  const filteredVideos = videos.filter((v) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "live") return v.isLive;
    if (typeFilter === "demo") return v.isDemo;
    if (typeFilter === "recorded") return !v.isLive && !v.isDemo;
    return true;
  });

  if (!batchId) {
    return <div className="text-center py-12 text-red-600">Invalid batch ID</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Course Videos – {batch?.name || `Batch ${batchId}`}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {batch?.category?.toUpperCase()} • Manage with advanced filters
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add New Video
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Filters Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[240px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Subject Filter */}
            <div className="min-w-[180px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Subject</label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div className="min-w-[160px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Class Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              />
            </div>

            {/* Type Filter */}
            <div className="min-w-[140px]">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
              >
                <option value="all">All Types</option>
                <option value="live">Live</option>
                <option value="recorded">Recorded</option>
                <option value="demo">Demo</option>
              </select>
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setSubjectFilter("");
                setDateFilter("");
                setTypeFilter("all");
              }}
              className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Table Section */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Schedule</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVideos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No videos found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredVideos.map((v, index) => (
                      <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3 font-medium">#{v.position}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{v.title}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {v.isDemo && <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded">Demo</span>}
                            {v.isDownloadable && <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded">DL</span>}
                            {v.isLive && (
                              <span className="text-[10px] px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse" /> LIVE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {subjects.find((s) => s.id === v.subjectId)?.name || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-full font-medium">
                            {v.videoSource.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                          {v.isLive && v.DateOfLive ? (
                            <>
                              {v.DateOfLive} • {v.TimeOfLIve}
                            </>
                          ) : v.dateOfClass ? (
                            <>
                              {v.dateOfClass} • {v.TimeOfClass}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${v.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              }`}
                          >
                            {v.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <button onClick={() => setPlaying(v)} className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg" title="Play">
                              <Play className="w-4 h-4 text-indigo-600" />
                            </button>
                            <button onClick={() => openEdit(v)} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg" title="Edit">
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => toggleStatus(v)} className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg" title="Toggle Status">
                              {v.status === "active" ? <Eye className="w-4 h-4 text-orange-600" /> : <EyeOff className="w-4 h-4 text-orange-600" />}
                            </button>
                            <button onClick={() => setDeleteVideo(v)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
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
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
                <div>
                  Showing {(pagination.page - 1) * pagination.limit + 1} –{" "}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => setPagination((p) => ({ ...p, page: 1 }))} disabled={pagination.page === 1} className="p-2 disabled:opacity-50">
                    <ChevronsLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1} className="p-2 disabled:opacity-50">
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
                    <span>Page</span>
                    <input
                      type="number"
                      name="jumpPage"
                      min={1}
                      max={pagination.totalPages}
                      defaultValue={pagination.page}
                      className="w-14 px-2 py-1 text-center border rounded dark:bg-gray-800"
                    />
                    <span>of {pagination.totalPages}</span>
                    <button type="submit" className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                      Go
                    </button>
                  </form>

                  <button onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="p-2 disabled:opacity-50">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button onClick={() => setPagination((p) => ({ ...p, page: p.totalPages }))} disabled={pagination.page === pagination.totalPages} className="p-2 disabled:opacity-50">
                    <ChevronsRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading & Error States */}
        {loading && (
          <div className="text-center py-20">
            <div className="inline-block animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading videos...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-20 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p>Failed to load videos. Please try again.</p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playing && (
        <div className="fixed inset-0 bg-black/95 z-[999999] flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPlaying(null)} className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="aspect-video">{renderPlayer(playing)}</div>
            <div className="p-4 bg-gradient-to-t from-black text-white">
              <h3 className="font-semibold">{playing.title}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full my-8">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                {editId ? "Edit Video" : "Add Video"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 space-y-3 max-h-[70vh] overflow-y-auto"
            >
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
              {/* Position */}
              {batch?.category === "recorded" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position *
                  </label>
                  <input
                    type="number"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              {/* Source */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source *
                </label>
                <select
                  value={form.videoSource}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      videoSource: e.target.value as "youtube" | "s3" | "vimeo",
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="youtube">YouTube</option>
                  <option value="s3">S3 / Direct</option>
                  <option value="vimeo">Vimeo</option>
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL *
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject *
                </label>
                <select
                  value={form.subjectId}
                  onChange={(e) =>
                    setForm({ ...form, subjectId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Thumbnail
                </label>
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-24 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setThumbnail(null);
                        setPreview("");
                      }}
                      className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded hover:bg-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-400 rounded cursor-pointer hover:border-indigo-500 transition">
                    <ImageIcon className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-600">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setThumbnail(file);
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isLive}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        isLive: e.target.checked,
                        DateOfLive: e.target.checked ? form.DateOfLive : "",
                        TimeOfLIve: e.target.checked ? form.TimeOfLIve : "",
                      })
                    }
                    className="w-3 h-3 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Live</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDemo}
                    onChange={(e) =>
                      setForm({ ...form, isDemo: e.target.checked })
                    }
                    className="w-3 h-3 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Demo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isDownloadable}
                    onChange={(e) =>
                      setForm({ ...form, isDownloadable: e.target.checked })
                    }
                    className="w-3 h-3 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">DL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.checked })
                    }
                    className="w-3 h-3 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>

              {!form.isLive && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {/* DATE */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Of Class *
                    </label>
                    <input
                      type="date"
                      value={form.dateOfClass}
                      onChange={(e) =>
                        setForm({ ...form, dateOfClass: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* TIME */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time of Class *
                    </label>
                    <input
                      type="time"
                      value={form.TimeOfClass}
                      onChange={(e) =>
                        setForm({ ...form, TimeOfClass: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}
              {/* Live Date/Time */}
              {form.isLive && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {/* DATE */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={form.DateOfLive}
                      onChange={(e) =>
                        setForm({ ...form, DateOfLive: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* TIME */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={form.TimeOfLIve}
                      onChange={(e) =>
                        setForm({ ...form, TimeOfLIve: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition"
                >
                  {editId ? "Update" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 max-w-xs w-full text-center shadow-xl">
            <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Delete Video?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              "{deleteVideo.title}" will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={removeVideo}
                disabled={deleteLoading}
                className="flex-1 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
              >
                {deleteLoading ? "Please Wait ....." : "Delete"}
              </button>
              <button
                onClick={() => setDeleteVideo(null)}
                disabled={deleteLoading}
                className="flex-1 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
