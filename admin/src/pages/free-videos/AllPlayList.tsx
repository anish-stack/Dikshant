import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import JoditEditor from 'jodit-react';
import { 
  Plus, Edit2, Trash2, Loader2, PlayCircle, ChevronDown, ChevronUp 
} from "lucide-react";

interface Video {
  id: number;
  title: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  duration: string;
  position: number;
  description?: string;     // New: Rich text description
  webViewHeight?: number;   // New: Height for web view / iframe
  playlistId?: number;
}

interface Playlist {
  id: number;
  title: string;
  slug: string;
  description: string;
  position: number;
  videos: Video[];
}

const API_BASE = "https://www.app.api.dikshantias.com/api/free";

const AllPlayList: React.FC = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<number, boolean>>({});

  // Modals
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);

  const [deleteItem, setDeleteItem] = useState<{ 
    type: "playlist" | "video"; 
    id: number; 
    title: string 
  } | null>(null);

  // Form States
  const [playlistForm, setPlaylistForm] = useState({ 
    title: "", 
    description: "", 
    position: "" 
  });

  const [videoForm, setVideoForm] = useState({ 
    title: "", 
    youtubeUrl: "", 
    duration: "", 
    position: "", 
    description: "",      // Rich text
    webViewHeight: ""     // e.g., 500
  });

  const editorRef = useRef<any>(null);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/playlist`);
      setPlaylists(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load playlists");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  const toggleVideos = (playlistId: number) => {
    setExpandedPlaylists(prev => ({
      ...prev,
      [playlistId]: !prev[playlistId]
    }));
  };

  // Jodit Config
  const joditConfig = useMemo(() => ({
    readonly: false,
    height: 320,
    placeholder: "Write detailed description for the video...",
    toolbarButtonSize: "middle",
    buttons: [
      "bold", "italic", "underline", "strikethrough", "|",
      "font", "fontsize", "brush", "paragraph", "|",
      "ul", "ol", "|",
      "link", "unlink", "image", "|",
      "align", "undo", "redo", "source"
    ],
  }), []);

  // Playlist Handlers
  const openAddPlaylist = () => {
    setEditingPlaylist(null);
    setPlaylistForm({ title: "", description: "", position: "" });
    setShowPlaylistModal(true);
  };

  const openEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist);
    setPlaylistForm({ 
      title: playlist.title, 
      description: playlist.description || "", 
      position: playlist.position.toString() 
    });
    setShowPlaylistModal(true);
  };

  const savePlaylist = async () => {
    try {
      const payload = {
        title: playlistForm.title,
        description: playlistForm.description,
        position: playlistForm.position ? parseInt(playlistForm.position) : undefined,
      };

      if (editingPlaylist) {
        await axios.put(`${API_BASE}/playlist/${editingPlaylist.id}`, payload);
      } else {
        await axios.post(`${API_BASE}/playlist`, payload);
      }
      setShowPlaylistModal(false);
      fetchPlaylists();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save playlist");
    }
  };

  // Video Handlers
  const openAddVideo = (playlistId: number) => {
    setSelectedPlaylistId(playlistId);
    setEditingVideo(null);
    setVideoForm({ 
      title: "", 
      youtubeUrl: "", 
      duration: "", 
      position: "", 
      description: "", 
      webViewHeight: "" 
    });
    setShowVideoModal(true);
  };

  const openEditVideo = (video: Video) => {
    setEditingVideo(video);
    setSelectedPlaylistId(video.playlistId || null);
    setVideoForm({
      title: video.title,
      youtubeUrl: video.youtubeUrl,
      duration: video.duration,
      position: video.position.toString(),
      description: video.description || "",
      webViewHeight: video.webViewHeight ? video.webViewHeight.toString() : "",
    });
    setShowVideoModal(true);
  };

  const saveVideo = async () => {
    if (!selectedPlaylistId) return;

    try {
      const payload = {
        title: videoForm.title,
        youtubeUrl: videoForm.youtubeUrl,
        duration: videoForm.duration,
        position: videoForm.position ? parseInt(videoForm.position) : undefined,
        description: videoForm.description,
        webViewHeight: videoForm.webViewHeight ? parseInt(videoForm.webViewHeight) : undefined,
        playlistId: selectedPlaylistId
      };

      if (editingVideo) {
        await axios.put(`${API_BASE}/video/${editingVideo.id}`, payload);
      } else {
        await axios.post(`${API_BASE}/video`, payload);
      }
      setShowVideoModal(false);
      fetchPlaylists();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save video");
    }
  };

  const openDeleteConfirm = (type: "playlist" | "video", id: number, title: string) => {
    setDeleteItem({ type, id, title });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.type === "playlist") {
        await axios.delete(`${API_BASE}/playlist/${deleteItem.id}`);
      } else {
        await axios.delete(`${API_BASE}/video/${deleteItem.id}`);
      }
      setShowDeleteModal(false);
      fetchPlaylists();
    } catch (err: any) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Free Content Admin</h1>
            <p className="text-gray-600 mt-1">Manage Playlists & Videos • Rich description + Web View Height supported</p>
          </div>
          <button
            onClick={openAddPlaylist}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-medium shadow transition-all active:scale-95"
          >
            <Plus size={22} />
            New Playlist
          </button>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-3xl shadow border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-8 py-5 text-left w-16">Pos</th>
                <th className="px-8 py-5 text-left">Playlist Title</th>
                <th className="px-8 py-5 text-left">Description</th>
                <th className="px-8 py-5 text-center w-32">Videos</th>
                <th className="px-8 py-5 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {playlists.map((playlist) => {
                const isExpanded = expandedPlaylists[playlist.id] || false;

                return (
                  <React.Fragment key={playlist.id}>
                    {/* Playlist Row */}
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-8 py-6 font-semibold text-gray-700">#{playlist.position}</td>
                      <td className="px-8 py-6 font-medium text-lg text-gray-900">{playlist.title}</td>
                      <td className="px-8 py-6 text-gray-600 text-sm">
                        {playlist.description || <span className="italic text-gray-400">No description</span>}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button
                          onClick={() => toggleVideos(playlist.id)}
                          className="flex items-center gap-2 mx-auto text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                        >
                          {playlist.videos.length} videos
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => openEditPlaylist(playlist)} className="p-2.5 hover:bg-blue-100 rounded-xl text-blue-600" title="Edit">
                            <Edit2 size={20} />
                          </button>
                          <button onClick={() => openAddVideo(playlist.id)} className="p-2.5 hover:bg-green-100 rounded-xl text-green-600" title="Add Video">
                            <Plus size={20} />
                          </button>
                          <button onClick={() => openDeleteConfirm("playlist", playlist.id, playlist.title)} className="p-2.5 hover:bg-red-100 rounded-xl text-red-600" title="Delete">
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Videos Section */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50 p-0">
                          <div className="px-8 py-6">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-semibold text-gray-800">Videos in "{playlist.title}"</h3>
                              <button
                                onClick={() => openAddVideo(playlist.id)}
                                className="text-sm flex items-center gap-2 text-green-600 hover:text-green-700"
                              >
                                <Plus size={18} /> Add Video
                              </button>
                            </div>

                            {playlist.videos.length === 0 ? (
                              <p className="text-gray-500 italic py-8 text-center">No videos added yet.</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="py-3 text-left w-20">Pos</th>
                                    <th className="py-3 text-left">Video Title</th>
                                    <th className="py-3 text-left">Duration</th>
                                    <th className="py-3 text-center w-40">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {playlist.videos.map((video) => (
                                    <tr key={video.id} className="hover:bg-white transition">
                                      <td className="py-4 font-medium text-gray-700">#{video.position}</td>
                                      <td className="py-4">
                                        <div className="flex items-center gap-3">
                                          <PlayCircle className="text-red-500" size={20} />
                                          <span className="font-medium">{video.title}</span>
                                        </div>
                                        {video.description && (
                                          <div className="text-xs text-gray-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: video.description }} />
                                        )}
                                      </td>
                                      <td className="py-4 text-gray-600">{video.duration}</td>
                                      <td className="py-4 text-center">
                                        <div className="flex justify-center gap-4">
                                          <button onClick={() => openEditVideo(video)} className="text-blue-600 hover:text-blue-700">
                                            <Edit2 size={18} />
                                          </button>
                                          <button onClick={() => openDeleteConfirm("video", video.id, video.title)} className="text-red-600 hover:text-red-700">
                                            <Trash2 size={18} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-6">
              {editingPlaylist ? "Edit Playlist" : "Create New Playlist"}
            </h2>
            {/* ... existing playlist form fields (title, description, position) ... */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input type="text" value={playlistForm.title} onChange={(e) => setPlaylistForm({ ...playlistForm, title: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={playlistForm.description} onChange={(e) => setPlaylistForm({ ...playlistForm, description: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl h-24 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <input type="number" min="1" value={playlistForm.position} onChange={(e) => setPlaylistForm({ ...playlistForm, position: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowPlaylistModal(false)} className="flex-1 py-4 border rounded-2xl hover:bg-gray-50">Cancel</button>
              <button onClick={savePlaylist} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700">Save Playlist</button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal with Jodit Editor + webViewHeight */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-999">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl max-h-[95vh] overflow-auto">
            <h2 className="text-2xl font-bold mb-6">
              {editingVideo ? "Edit Video" : "Add New Video"}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Title</label>
                <input type="text" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
                <input type="text" value={videoForm.youtubeUrl} onChange={(e) => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (e.g. 12:45)</label>
                  <input type="text" value={videoForm.duration} onChange={(e) => setVideoForm({ ...videoForm, duration: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                  <input type="number" min="1" value={videoForm.position} onChange={(e) => setVideoForm({ ...videoForm, position: e.target.value })} className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Web View Height (px) — for iframe/embed</label>
                <input 
                  type="number" 
                  min="200" 
                  value={videoForm.webViewHeight} 
                  onChange={(e) => setVideoForm({ ...videoForm, webViewHeight: e.target.value })} 
                  className="w-full px-5 py-3 border border-gray-300 rounded-2xl focus:border-blue-500" 
                  placeholder="600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Video Description (Rich Text)</label>
                <JoditEditor
                  ref={editorRef}
                  value={videoForm.description}
                  config={joditConfig}
                  onBlur={(newContent) => setVideoForm({ ...videoForm, description: newContent })}
                  onChange={(newContent) => {}}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowVideoModal(false)} className="flex-1 py-4 border border-gray-300 rounded-2xl hover:bg-gray-50">Cancel</button>
              <button onClick={saveVideo} className="flex-1 py-4 bg-green-600 text-white rounded-2xl hover:bg-green-700">
                {editingVideo ? "Update Video" : "Add Video"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal - unchanged */}
      {showDeleteModal && deleteItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md text-center">
            <Trash2 className="mx-auto text-red-500 mb-6" size={56} />
            <h3 className="text-2xl font-semibold mb-3">Are you sure?</h3>
            <p className="text-gray-600 mb-8">
              You are about to delete <strong>"{deleteItem.title}"</strong>.<br />
              This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-4 border rounded-2xl hover:bg-gray-50">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPlayList;