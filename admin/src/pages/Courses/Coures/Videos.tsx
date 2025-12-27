import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { useNavigate, useParams } from "react-router";

const API_URL = "https://www.dikapi.olyox.in/api/videocourses";
const BATCHS_API = "https://www.dikapi.olyox.in/api/batchs";
const ITEMS_PER_PAGE = 10;

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
  isDemo: boolean;
  status: "active" | "inactive";
  batchId: number;
  isLive?: boolean;
  DateOfLive?: string;
  TimeOfLIve?: string;
  isLiveEnded?: boolean;
}

interface FormData {
  title: string;
  videoSource: "youtube" | "s3" | "vimeo";
  url: string;
  isLive: boolean;
  DateOfLive: string;
  TimeOfLIve: string;
  subjectId: string;
  isDownloadable: boolean;
  isDemo: boolean;
  status: boolean;
}

const getCurrentDate = () => {
  const d = new Date();
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
};

const getCurrentTime = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 5); // HH:mm
};

export default function CourseVideos() {
  const { id } = useParams<{ id: string }>();
  const batchId = id ? Number(id) : null;
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
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
    subjectId: "",
    isDownloadable: false,
    isDemo: false,
    status: true,
  });

  const navigate = useNavigate();

  const fetchVideos = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      const [videoRes, subjectRes] = await Promise.all([
        axios.get(`${API_URL}/batch/${batchId}`),
        axios.get(`${BATCHS_API}/${batchId}`),
      ]);

      setVideos(videoRes.data.data || []);
      setSubjects(subjectRes.data.subjects || []);
    } catch (error) {
      console.error(error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Search and pagination
  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );
  const total = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setPage(1);
  }, [search]);

  // Modal handlers
  const openAdd = () => {
    setEditId(null);
    setForm({
      title: "",
      videoSource: "youtube",
      url: "",
      isLive: false,
      DateOfLive: "",
      TimeOfLIve: "",
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
      subjectId: v.subjectId.toString(),
      isDownloadable: v.isDownloadable,
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

  // Actions
  const toggleStatus = async (v: VideoItem) => {
    const newStatus = v.status === "active" ? "inactive" : "active";
    try {
      await axios.put(`${API_URL}/${v.id}`, { status: newStatus });
      setVideos((prev) =>
        prev.map((item) =>
          item.id === v.id ? { ...item, status: newStatus } : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const endLiveSession = async (v: VideoItem) => {
    try {
      await axios.put(`${API_URL}/${v.id}`, { isLiveEnded: true });
      setVideos((prev) =>
        prev.map((item) =>
          item.id === v.id ? { ...item, isLiveEnded: true } : item
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const removeVideo = async () => {
    if (!deleteVideo) return;
    try {
      await axios.delete(`${API_URL}/${deleteVideo.id}`);
      setVideos((prev) => prev.filter((v) => v.id !== deleteVideo.id));
      setDeleteVideo(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.isLive && (!form.DateOfLive || !form.TimeOfLIve)) {
      alert("Please set date and time for live video");
      return;
    }

    const data = new FormData();
    data.append("title", form.title);
    data.append("videoSource", form.videoSource);
    data.append("url", form.url);
    if (!batchId) {
      alert("Invalid batch ID");
      return;
    }

    data.append("batchId", String(batchId));
    data.append("subjectId", form.subjectId);
    data.append("isDownloadable", String(form.isDownloadable));
    data.append("isDemo", String(form.isDemo));
    data.append("isLive", String(form.isLive));
    data.append("status", form.status ? "active" : "inactive");

    if (form.isLive) {
      data.append("DateOfLive", form.DateOfLive);
      data.append("TimeOfLIve", form.TimeOfLIve);
    }

    if (thumbnail) data.append("imageUrl", thumbnail);

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, data);
      } else {
        await axios.post(API_URL, data);
      }
      setShowModal(false);
      fetchVideos();
    } catch (err) {
      console.error(err);
    }
  };

  // YouTube embed
  const getYTEmbed = (url: string) => {
    const match = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const renderPlayer = (v: VideoItem) => {
    if (v.videoSource === "youtube") {
      const embed = getYTEmbed(v.url);
      return embed ? (
        <iframe src={embed} className="w-full h-full" allowFullScreen />
      ) : (
        <div className="text-red-400 flex items-center justify-center h-full text-sm">
          Invalid YouTube URL
        </div>
      );
    }
    return <video src={v.url} controls className="w-full h-full" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Course Videos
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Manage batch videos
            </p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Add Video
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Search */}
        {!loading && !error && (
          <div className="mb-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Loading videos...
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Failed to load videos. Please refresh.
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Image
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Title
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Subject
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Comments
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Schedule
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                      >
                        {search ? "No videos found" : "No videos yet"}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((v) => (
                      <tr
                        key={v.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                      >
                        <td className="px-3 py-2">
                          <img
                            src={
                              v.imageUrl || "https://via.placeholder.com/50x30"
                            }
                            alt={v.title}
                            className="w-12 h-7 object-cover rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                              {v.title}
                            </p>
                            <div className="flex gap-1 mt-0.5">
                              {v.isDemo && (
                                <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                                  Demo
                                </span>
                              )}
                              {v.isDownloadable && (
                                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                                  DL
                                </span>
                              )}
                              {v.isLive && (
                                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded flex items-center gap-0.5">
                                  <span className="w-1 h-1 bg-purple-600 rounded-full animate-pulse"></span>
                                  Live
                                </span>
                              )}
                              {v.isLiveEnded && (
                                <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-red-700 dark:bg-purple-900/30 dark:text-red-400 rounded flex items-center gap-0.5">
                                  <span className="w-1 h-1 bg-red-600 rounded-full animate-pulse"></span>
                                  Live End
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          {subjects.find((s) => s.id === v.subjectId)?.name ||
                            "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          <button
                            onClick={() =>
                              navigate(`/view-comments-joined/${v.id}`)
                            }
                            className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 rounded transition"
                            title="View Joined Students "
                          >
                            View Comments
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 rounded font-medium">
                            {v.videoSource.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                          {v.isLive && v.DateOfLive && v.TimeOfLIve ? (
                            <div className="text-xs">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {v.DateOfLive.replace(/-/g, "/")}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {v.TimeOfLIve.slice(0, 5)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`text-xs px-2 py-1 rounded font-semibold ${
                              v.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {v.status.charAt(0).toUpperCase() +
                              v.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => setPlaying(v)}
                              className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded transition"
                              title="Play"
                            >
                              <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </button>
                            {v.isLive && (
                              <>
                                <button
                                  onClick={() => {
                                    if (!v.isLiveEnded) endLiveSession(v);
                                  }}
                                  disabled={v.isLiveEnded}
                                  title={
                                    v.isLiveEnded
                                      ? "Live already ended"
                                      : "End Live Session"
                                  }
                                  className={`
    p-1.5 rounded transition
    ${
      v.isLiveEnded
        ? "bg-gray-200 dark:bg-gray-700 cursor-not-allowed opacity-60"
        : "bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
    }
  `}
                                >
                                  End Live
                                </button>

                                <button
                                  onClick={() => navigate(`/view-chat/${v.id}`)}
                                  type="button"
                                  className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 rounded transition"
                                  title="View Chats"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                </button>
                                <button
                                  onClick={() =>
                                    navigate(`/view-studnets-joined/${v.id}`)
                                  }
                                  className="p-1.5 bg-cyan-100 dark:bg-cyan-900/30 hover:bg-cyan-200 dark:hover:bg-cyan-900/50 rounded transition"
                                  title="View Joined Students "
                                >
                                  <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => openEdit(v)}
                              className="p-1.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={() => toggleStatus(v)}
                              className="p-1.5 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded transition"
                              title={v.status === "active" ? "Hide" : "Show"}
                            >
                              {v.status === "active" ? (
                                <Eye className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteVideo(v)}
                              className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
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
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {(page - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-2 py-1 text-xs rounded border transition ${
                        page === p
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(total, p + 1))}
                    disabled={page === total}
                    className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Player */}
      {playing && (
        <div
          className="fixed inset-0 bg-black/95 z-[999999] flex items-center justify-center p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPlaying(null)}
              className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <div className="aspect-video">{renderPlayer(playing)}</div>
            <div className="p-3 bg-gradient-to-t from-black to-transparent text-white">
              <h3 className="font-semibold text-sm">{playing.title}</h3>
              <p className="text-xs opacity-70 mt-1">
                {subjects.find((s) => s.id === playing.subjectId)?.name} •{" "}
                {playing.videoSource.toUpperCase()}
              </p>
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
                      min={
                        form.DateOfLive === getCurrentDate()
                          ? getCurrentTime() // ❌ past time blocked only for today
                          : undefined
                      }
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
                className="flex-1 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded font-medium transition"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteVideo(null)}
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
