import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = "https://www.app.api.dikshantias.com/api/pdfnotes";

interface Category {
  id: string;
  name: string;
}

interface PdfItem {
  id: string;
  title: string;
  pdfCategory: string;
  fileUrl: string;
}

const ITEMS_PER_PAGE = 6;

const UploadPdf = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const batchId = params.get("batch");
  const videoId = params.get("video");
  const titleSlug = params.get("title");
  const defaultTitle = titleSlug ? titleSlug.replace(/-/g, " ") : "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [pdfs, setPdfs] = useState<PdfItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<PdfItem | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: defaultTitle,
    pdfCategory: "",
    file: null as File | null,
  });
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    fetchCategories();
    fetchPdfs();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}/pdf-category`);
      setCategories(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };

  const fetchPdfs = async () => {
    setFetching(true);
    try {
      const res = await axios.get(API_BASE, { params: { videoId } });
      setPdfs(res.data.data || res.data || []);
    } catch (err) {
      toast.error("Failed to load PDFs");
    } finally {
      setFetching(false);
    }
  };

  /* ================= FORM HANDLERS ================= */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (e.target instanceof HTMLInputElement && e.target.files) {
      setForm({ ...form, file: e.target.files[0] });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const resetForm = () => {
    setForm({ title: defaultTitle, pdfCategory: "", file: null });
    setEditId(null);
  };

  const openUploadModal = () => {
    resetForm();
    setUploadModalOpen(true);
  };

  const openEditModal = (item: PdfItem) => {
    setEditId(item.id);
    setForm({
      title: item.title,
      pdfCategory: item.pdfCategory,
      file: null,
    });
    setUploadModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pdfCategory) return toast.error("Please select a category");
    if (!editId && !form.file) return toast.error("Please select a PDF file");

    setLoading(true);
    const data = new FormData();
    data.append("title", form.title);
    data.append("pdfCategory", form.pdfCategory);
    data.append("batchId", batchId || "");
    data.append("videoId", videoId || "");
    if (form.file) data.append("fileUrl", form.file);

    const token = localStorage.getItem("accessToken");

    try {
      if (editId) {
        await axios.put(`${API_BASE}/${editId}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("PDF updated successfully!");
      } else {
        await axios.post(API_BASE, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("PDF uploaded successfully!");
      }
      resetForm();
      setUploadModalOpen(false);
      fetchPdfs();
      setCurrentPage(1);
    } catch (err: any) {
      const message =
        err.response?.data?.message || (editId ? "Update failed" : "Upload failed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE ================= */
  const openDeleteModal = (item: PdfItem) => {
    setSelectedPdf(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedPdf) return;
    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API_BASE}/${selectedPdf.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("PDF deleted successfully");
      fetchPdfs();
      if (pdfs.length % ITEMS_PER_PAGE === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      toast.error("Delete failed");
    }
    setDeleteModalOpen(false);
  };

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(pdfs.length / ITEMS_PER_PAGE);
  const paginatedPdfs = pdfs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCategoryName = (catId: string) =>
    categories.find((c) => c.id === catId)?.name || "Unknown";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">PDF Notes</h1>

        <button
          onClick={openUploadModal}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-md"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload New PDF
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><span className="font-semibold">Batch:</span> {batchId || "-"}</div>
          <div><span className="font-semibold">Title:</span> {defaultTitle || "-"}</div>
        </div>
      </div>

      {/* PDF List */}
      <div>
        <h2 className="text-2xl font-semibold mb-5 text-gray-800">
          Uploaded PDFs ({pdfs.length})
        </h2>

        {fetching ? (
          <p className="text-center text-gray-500 py-10">Loading PDFs...</p>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No PDFs uploaded yet.</p>
            <button
              onClick={openUploadModal}
              className="mt-4 text-indigo-600 hover:underline"
            >
              Upload the first one →
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedPdfs.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {getCategoryName(item.pdfCategory)}
                  </p>
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 text-sm font-medium hover:underline inline-flex items-center gap-1 mb-4"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View PDF
                  </a>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex-1 px-3 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteModal(item)}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-10">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="px-5 py-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload / Edit Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-5">
              {editId ? "Edit PDF" : "Upload New PDF"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="pdfCategory"
                  value={form.pdfCategory}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Choose category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PDF File {editId && "(leave blank to keep current)"}
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleChange}
                  {...(editId ? {} : { required: true })}
                  className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(false);
                    resetForm();
                  }}
                  className="flex-1 px-5 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "Saving..." : editId ? "Update" : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete "<strong>{selectedPdf.title}</strong>"?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-5 py-3 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPdf;