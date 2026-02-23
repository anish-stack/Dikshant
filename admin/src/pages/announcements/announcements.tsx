"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Search,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import JoditEditor from "jodit-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const API_URL = "https://www.app.api.dikshantias.com/api/announcements";

interface Announcement {
  id: number;
  title: string;
  message: string;
  publishDate: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    message: "",
    publishDate: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const editorRef = useRef(null);

  const joditConfig = useMemo(
    () => ({
      readonly: false,
      height: 420,
      minHeight: 380,
      maxHeight: 600,
      placeholder: "Write detailed announcement content here...",
      toolbarAdaptive: false,
      showCharsCounter: true,
      showWordsCounter: true,
      spellcheck: true,
      autofocus: false,
      askBeforePasteHTML: false,
      askBeforePasteFromWord: false,
      language: "en",
    }),
    []
  );

  // Fetch announcements
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<Announcement[]>(`${API_URL}?isAdmin=true`);
      const sorted = [...data].sort(
        (a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
      );
      setAnnouncements(sorted);
    } catch (err) {
      toast.error("Failed to load announcements");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Filter & Pagination
  const filteredAnnouncements = announcements.filter(
    (ann) =>
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const paginated = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Form handlers
  const openCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setForm({ title: "", message: "", publishDate: "", description: "" });
    setIsFormOpen(true);
  };

  const openEdit = (ann: Announcement) => {
    setIsEditMode(true);
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      message: ann.message,
      description: ann.description,
      publishDate: ann.publishDate.split("T")[0],
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim() || !form.publishDate) {
      return toast.error("Title, message, and publish date are required");
    }

    setSubmitting(true);

    try {
      if (isEditMode && editingId) {
        await axios.put(`${API_URL}/${editingId}`, form);
        toast.success("Announcement updated successfully");
      } else {
        await axios.post(API_URL, form);
        toast.success("Announcement created successfully");
      }

      setIsFormOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        `Failed to ${isEditMode ? "update" : "create"} announcement`;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await axios.delete(`${API_URL}/${deleteTarget.id}`);
      toast.success("Announcement deleted");
      setDeleteTarget(null);
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  return (
    <>
      <PageMeta title="Announcements | Admin" description="Manage system announcements" />
      <PageBreadcrumb pageTitle="Announcements" />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header + Add Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Announcements
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {announcements.length} {searchTerm && `(filtered: ${filteredAnnouncements.length})`}
            </p>
          </div>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus size={18} />
            New Announcement
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  // Skeleton rows
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-56 animate-pulse" /></td>
                      <td className="px-6 py-5"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-80 animate-pulse" /></td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-3">
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-gray-500 dark:text-gray-400">
                      {searchTerm ? "No matching announcements found" : "No announcements yet"}
                    </td>
                  </tr>
                ) : (
                  paginated.map((ann) => (
                    <tr
                      key={ann.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Calendar size={14} className="text-gray-400" />
                          {formatDate(ann.publishDate)}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-gray-900 dark:text-white max-w-xs truncate">
                        {ann.title}
                      </td>
                      <td className="px-6 py-5 text-gray-600 dark:text-gray-300 max-w-md truncate">
                        {ann.message}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEdit(ann)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(ann)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-5 border-t dark:border-gray-800">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-5 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Previous
              </button>

              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-5 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? "Edit Announcement" : "Create New Announcement"}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-gray-800"
                  required
                />
              </div>

              {/* Short Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Short Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-white dark:bg-gray-800"
                  placeholder="One-line summary or headline..."
                  required
                />
              </div>

              {/* Rich Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Description / Content
                </label>
                <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <JoditEditor
                    ref={editorRef}
                    value={form.description}
                    config={joditConfig}
                    tabIndex={1}
                    onBlur={(newContent) => setForm({ ...form, description: newContent })}
                  />
                </div>
              </div>

              {/* Publish Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Publish Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-gray-800"
                  required
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-4 px-6 py-5 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
                disabled={submitting}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  submitting
                    ? "bg-indigo-400 text-white cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isEditMode ? "Updating..." : "Creating..."}
                  </span>
                ) : isEditMode ? (
                  "Update Announcement"
                ) : (
                  "Create Announcement"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <AlertCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-3">Delete Announcement?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Are you sure you want to permanently delete
              <br />
              <strong className="text-gray-900 dark:text-white">"{deleteTarget.title}"</strong>?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}