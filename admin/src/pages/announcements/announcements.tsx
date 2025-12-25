import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus, Edit, Trash2, Calendar, Search, X, AlertCircle } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const API_URL = "https://www.dikapi.olyox.in/api/announcements";

interface Announcement {
  id: number;
  title: string;
  message: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
}

const Announcements = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [formModal, setFormModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<Announcement | null>(null);

  // Form
  const [form, setForm] = useState({ title: "", message: "", publishDate: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Announcement[]>(API_URL);
      const sorted = res.data.sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime());
      setAnnouncements(sorted);
    } catch (error) {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Search & Pagination
  const filtered = announcements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const openAdd = () => {
    setEditMode(false);
    setEditingId(null);
    setForm({ title: "", message: "", publishDate: "" });
    setFormModal(true);
  };

  const openEdit = (ann: Announcement) => {
    setEditMode(true);
    setEditingId(ann.id);
    setForm({
      title: ann.title,
      message: ann.message,
      publishDate: ann.publishDate.split("T")[0],
    });
    setFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message || !form.publishDate) return toast.error("All fields required");

    setSubmitting(true);
    try {
      if (editMode && editingId) {
        await axios.put(`${API_URL}/${editingId}`, form);
        toast.success("Announcement updated!");
      } else {
        await axios.post(API_URL, form);
        toast.success("Announcement created!");
      }
      setFormModal(false);
      setForm({ title: "", message: "", publishDate: "" });
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${editMode ? "update" : "create"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await axios.delete(`${API_URL}/${deleteModal.id}`);
      toast.success("Announcement deleted");
      setDeleteModal(null);
      fetchAnnouncements();
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <>
      <PageMeta title="Announcements" description="" />
      <PageBreadcrumb pageTitle="Announcements" />

      <div className="max-w-full mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total: {announcements.length}</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium shadow"
          >
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-4 mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title or message..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow">
          <table className="w-full min-w-max text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Message</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="flex justify-center gap-2"><div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /></div></td>
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500">
                    {searchTerm ? "No announcements match your search" : "No announcements found"}
                  </td>
                </tr>
              ) : (
                paginated.map((ann) => (
                  <tr key={ann.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{formatDate(ann.publishDate)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white text-sm max-w-xs truncate">
                        {ann.title}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-700 dark:text-gray-300 max-w-md truncate">
                        {ann.message}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => openEdit(ann)} 
                          className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded hover:bg-blue-200 transition"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </button>
                        <button 
                          onClick={() => setDeleteModal(ann)} 
                          className="p-2 bg-red-100 dark:bg-red-900/50 rounded hover:bg-red-200 transition"
                          title="Delete"
                        >
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
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {formModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-xl font-bold">{editMode ? "Edit Announcement" : "Create Announcement"}</h2>
              <button onClick={() => setFormModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Publish Date</label>
                <input
                  type="date"
                  value={form.publishDate}
                  onChange={e => setForm({ ...form, publishDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4 border-t dark:border-gray-800">
                <button
                  onClick={(e) => { e.preventDefault(); handleSubmit(e); }}
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {submitting ? (editMode ? "Updating..." : "Creating...") : (editMode ? "Update" : "Create")}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-999999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Delete Announcement?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Delete "<strong>{deleteModal.title}</strong>" permanently?
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={handleDelete} 
                className="px-5 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
              <button 
                onClick={() => setDeleteModal(null)} 
                className="px-5 py-2 border border-gray-300 dark:border-gray-700 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Announcements;