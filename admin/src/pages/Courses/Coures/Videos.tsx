import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Play, Plus, Edit, Trash2, ToggleLeft, ToggleRight, X, AlertCircle, Link2, ImageIcon } from "lucide-react";

const API_URL = "http://localhost:5001/api/videocourses";
const SUBJECTS_API = "http://localhost:5001/api/subjects";

interface Subject {
  id: number;
  name: string;
}

interface Video {
  id: number;
  title: string;
  imageUrl: string;
  videoSource: "youtube" | "s3" | "vimeo";
  url: string;
  subjectId: number;
  subject?: Subject;
  isDownloadable: boolean;
  isDemo: boolean;
  status: "active" | "inactive";
  batchId: number;
  programId: number;
}

const CourseVideos = () => {
  const { id } = useParams<{ id: string }>();
  const batchId = id ? parseInt(id) : null;

  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [formModal, setFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Video | null>(null);
  const [form, setForm] = useState({
    title: "",
    videoSource: "youtube" as "youtube" | "s3",
    url: "",
    subjectId: "",
    isDownloadable: false,
    isDemo: false,
    status: true,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, [batchId]);

  const fetchData = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const [videosRes, subjectsRes] = await Promise.all([
        axios.get<{ success: boolean; data: Video[] }>(`${API_URL}/batch/${batchId}`),
        axios.get<Subject[]>(SUBJECTS_API),
      ]);
      setVideos(videosRes.data.success ? videosRes.data.data : []);
      setSubjects(subjectsRes.data);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditMode(false);
    setEditingId(null);
    setForm({
      title: "",
      videoSource: "youtube",
      url: "",
      subjectId: "",
      isDownloadable: false,
      isDemo: false,
      status: true,
    });
    setThumbnailFile(null);
    setThumbnailPreview("");
    setFormModal(true);
  };

  const openEditModal = (video: Video) => {
    setEditMode(true);
    setEditingId(video.id);
    setForm({
      title: video.title,
      videoSource: video.videoSource,
      url: video.url,
      subjectId: video.subjectId.toString(),
      isDownloadable: video.isDownloadable,
      isDemo: video.isDemo,
      status: video.status === "active",
    });
    setThumbnailPreview(video.imageUrl);
    setFormModal(true);
  };

  const toggleStatus = async (video: Video) => {
    try {
      const newStatus = video.status === "active" ? "inactive" : "active";
      await axios.put(`${API_URL}/${video.id}`, { status: newStatus });
      toast.success(`Video ${newStatus === "active" ? "activated" : "deactivated"}`);
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, status: newStatus } : v));
    } catch {
      toast.error("Failed to update status");
    }
  };

  const deleteVideo = async () => {
    if (!deleteModal) return;
    try {
      await axios.delete(`${API_URL}/${deleteModal.id}`);
      toast.success("Video deleted");
      setVideos(prev => prev.filter(v => v.id !== deleteModal.id));
      setDeleteModal(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) return;

    const formData = new FormData();
    formData.append("title", form.title);
    formData.append("videoSource", form.videoSource);
    formData.append("url", form.url);
    formData.append("batchId", batchId.toString());
    formData.append("subjectId", form.subjectId);
    formData.append("programId", "1");
    formData.append("isDownloadable", form.isDownloadable.toString());
    formData.append("isDemo", form.isDemo.toString());
    formData.append("status", form.status ? "active" : "inactive");
    if (thumbnailFile) formData.append("imageUrl", thumbnailFile);

    try {
      if (editMode && editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Video updated successfully!");
      } else {
        await axios.post(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Video added successfully!");
      }
      setFormModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${editMode ? "update" : "add"} video`);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  };

  const renderVideoPlayer = (video: Video) => {
    if (video.videoSource === "youtube") {
      const embedUrl = getYouTubeEmbedUrl(video.url);
      return embedUrl ? (
        <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="autoplay" />
      ) : (
        <div className="flex items-center justify-center h-full text-red-500">Invalid URL</div>
      );
    }
    return <video src={video.url} controls className="w-full h-full" />;
  };

  return (
    <>
      <PageMeta title="Course Videos" />
      <PageBreadcrumb pageTitle="Course Videos" />

      <div className="max-w-full mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Videos</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total: {videos.length} videos</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium shadow"
          >
            <Plus className="w-4 h-4" /> Add Video
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow">
          <table className="w-full min-w-max table-auto text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Thumbnail</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="flex gap-2 justify-center"><div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></div></td>
                  </tr>
                ))
              ) : videos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No videos found. Click "Add Video" to get started.
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3">
                      <img
                        src={video.imageUrl || "https://via.placeholder.com/80x45"}
                        alt={video.title}
                        className="w-16 h-10 object-cover rounded shadow"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">{video.title}</div>
                      <div className="flex gap-1 mt-1">
                        {video.isDemo && <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Demo</span>}
                        {video.isDownloadable && <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">Downloadable</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-sm">
                      {subjects.find(s => s.id === video.subjectId)?.name || `Subject ${video.subjectId}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400 text-xs font-medium rounded">
                        {video.videoSource.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${video.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                        {video.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => setSelectedVideo(video)} className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded hover:bg-indigo-200 transition" title="Play">
                          <Play className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </button>
                        <button onClick={() => openEditModal(video)} className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded hover:bg-blue-200 transition" title="Edit">
                          <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button onClick={() => toggleStatus(video)} className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded hover:bg-yellow-200 transition" title="Toggle Status">
                          {video.status === "active" ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-red-600" />}
                        </button>
                        <button onClick={() => setDeleteModal(video)} className="p-2 bg-red-100 dark:bg-red-900/50 rounded hover:bg-red-200 transition" title="Delete">
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
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/90 z-99999 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
          <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedVideo(null)} className="absolute top-3 right-3 z-10 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center">
              <X className="w-6 h-6 text-white" />
            </button>
            <div className="aspect-video">
              {renderVideoPlayer(selectedVideo)}
            </div>
            <div className="p-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 text-white">
              <h3 className="text-xl font-bold">{selectedVideo.title}</h3>
              <p className="text-sm opacity-90 mt-1">
                {subjects.find(s => s.id === selectedVideo.subjectId)?.name} • {selectedVideo.videoSource.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Video Modal */}
      {formModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-xl font-bold">{editMode ? "Edit Video" : "Add New Video"}</h2>
              <button onClick={() => setFormModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Video Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Video Source</label>
                <select
                  value={form.videoSource}
                  onChange={e => setForm({ ...form, videoSource: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                >
                  <option value="youtube">YouTube</option>
                  <option value="s3">S3 / Direct Link</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {form.videoSource === "youtube" ? "YouTube URL" : "Video URL"}
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => setForm({ ...form, url: e.target.value })}
                    placeholder={form.videoSource === "youtube" ? "https://youtube.com/watch?v=..." : "https://your-s3-link.com/video.mp4"}
                    className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <select
                  value={form.subjectId}
                  onChange={e => setForm({ ...form, subjectId: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                  required
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thumbnail Image</label>
                {thumbnailPreview ? (
                  <div className="relative inline-block">
                    <img src={thumbnailPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => { setThumbnailFile(null); setThumbnailPreview(""); }}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-400 rounded-lg cursor-pointer hover:border-indigo-500 transition">
                    <ImageIcon className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">Click to upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setThumbnailFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => setThumbnailPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDemo} onChange={e => setForm({ ...form, isDemo: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-medium">Demo Video</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isDownloadable} onChange={e => setForm({ ...form, isDownloadable: e.target.checked })} className="w-4 h-4" />
                  <span className="text-sm font-medium">Allow Download</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                <button
                  onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition shadow"
                >
                  {editMode ? "Update Video" : "Add Video"}
                </button>
                <button
                  onClick={() => setFormModal(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full shadow-2xl text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Delete Video?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Delete "<strong>{deleteModal.title}</strong>" permanently?
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={deleteVideo} className="px-5 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
                Yes, Delete
              </button>
              <button onClick={() => setDeleteModal(null)} className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CourseVideos;