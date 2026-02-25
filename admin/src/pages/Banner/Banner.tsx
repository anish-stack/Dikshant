import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Upload,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";

import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const API_URL = "https://www.app.api.dikshantias.com/api/banners";

interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  status: boolean;
  createdAt: string;
}

export default function BannerManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filteredBanners, setFilteredBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<Banner | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    linkUrl: "",
    image: null as File | null,
  });
  const [preview, setPreview] = useState("");
  const [formErrors, setFormErrors] = useState<{ title?: string; image?: string }>({});

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<Banner[]>(API_URL);
      const sorted = res.data.sort((a, b) => a.position - b.position);
      setBanners(sorted);
      setFilteredBanners(sorted);
    } catch (err) {
      console.error("Failed to fetch banners:", err);
      toast.error("Could not load banners");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // Search filtering
  useEffect(() => {
    const term = search.toLowerCase().trim();
    const result = banners.filter(
      (b) =>
        b.title.toLowerCase().includes(term) ||
        b.linkUrl?.toLowerCase().includes(term)
    );
    setFilteredBanners(result);
    setPage(1);
  }, [search, banners]);

  const totalPages = Math.ceil(filteredBanners.length / perPage);
  const paginated = filteredBanners.slice((page - 1) * perPage, page * perPage);

  const nextPosition = banners.length > 0
    ? Math.max(...banners.map((b) => b.position)) + 1
    : 1;

  const validateForm = () => {
    const errors: typeof formErrors = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!editBanner && !form.image) errors.image = "Image is required for new banners";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setForm((prev) => ({ ...prev, image: file }));
    setPreview(URL.createObjectURL(file));
    setFormErrors((prev) => ({ ...prev, image: undefined }));
  };

  const resetForm = () => {
    setForm({ title: "", linkUrl: "", image: null });
    setPreview("");
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionLoading(true);
    const toastId = toast.loading(editBanner ? "Updating banner..." : "Creating banner...");

    const data = new FormData();
    data.append("title", form.title.trim());
    data.append("linkUrl", form.linkUrl.trim());
    data.append("position", editBanner ? editBanner.position.toString() : nextPosition.toString());
    data.append("status", "true");
    if (form.image) data.append("imageUrl", form.image); // backend should handle field name "imageUrl" or change to "image"

    try {
      if (editBanner) {
        await axios.put(`${API_URL}/${editBanner.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner updated successfully", { id: toastId });
        console.log(`Banner updated: #${editBanner.id} - ${form.title}`);
      } else {
        await axios.post(API_URL, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Banner created successfully", { id: toastId });
        console.log(`New banner created: ${form.title} (pos: ${nextPosition})`);
      }

      resetForm();
      setCreateModal(false);
      setEditBanner(null);
      await fetchBanners();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg, { id: toastId });
      console.error("Banner save failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async (banner: Banner) => {
    const newStatus = !banner.status;
    const toastId = toast.loading("Updating status...");

    try {
      await axios.put(`${API_URL}/${banner.id}`, { status: newStatus });
      toast.success(`Banner ${newStatus ? "activated" : "deactivated"}`, { id: toastId });
      console.log(`Status changed: #${banner.id} → ${newStatus ? "Active" : "Inactive"}`);

      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, status: newStatus } : b))
      );
    } catch (err) {
      toast.error("Failed to update status", { id: toastId });
      console.error("Status toggle failed:", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteBanner) return;
    setActionLoading(true);
    const toastId = toast.loading("Deleting banner...");

    try {
      await axios.delete(`${API_URL}/${deleteBanner.id}`);
      toast.success("Banner deleted", { id: toastId });
      console.log(`Banner deleted: #${deleteBanner.id} - ${deleteBanner.title}`);
      setDeleteBanner(null);
      await fetchBanners();
    } catch (err) {
      toast.error("Failed to delete banner", { id: toastId });
      console.error("Delete failed:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (banner: Banner) => {
    setForm({
      title: banner.title,
      linkUrl: banner.linkUrl || "",
      image: null,
    });
    setPreview(banner.imageUrl);
    setEditBanner(banner);
    setCreateModal(true);
  };

  return (
    <>
      <PageMeta title="Manage Banners" description="Create, edit and organize website banners" />
      <PageBreadcrumb pageTitle="Banners" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Banners
              <span className="ml-3 text-lg font-normal text-gray-500">({banners.length})</span>
            </h1>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditBanner(null);
              setCreateModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus size={18} /> Add New Banner
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search by title or link..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Pos</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Image</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Link</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array(6).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-5">
                        <div className="animate-pulse h-8 bg-gray-200 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-gray-500">
                      {search ? "No matching banners found" : "No banners yet"}
                    </td>
                  </tr>
                ) : (
                  paginated.map((banner) => (
                    <tr key={banner.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap font-semibold text-indigo-600">
                        #{banner.position}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <img
                          src={banner.imageUrl}
                          alt={banner.title}
                          className="w-28 h-20 object-cover rounded-lg shadow-sm border border-gray-200"
                          onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/150?text=Error")}
                        />
                      </td>
                      <td className="px-6 py-5 font-medium text-gray-900 max-w-xs truncate">
                        {banner.title}
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-600 max-w-xs truncate">
                        {banner.linkUrl || "—"}
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            banner.status
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {banner.status ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(banner)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => toggleStatus(banner)}
                            className="p-2 hover:bg-yellow-50 rounded-lg transition"
                            title={banner.status ? "Deactivate" : "Activate"}
                          >
                            {banner.status ? (
                              <ToggleRight size={22} className="text-green-600" />
                            ) : (
                              <ToggleLeft size={22} className="text-red-600" />
                            )}
                          </button>
                          <button
                            onClick={() => setDeleteBanner(banner)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
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
            <div className="px-6 py-4 flex items-center justify-between border-t">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-5 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page <strong>{page}</strong> of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="px-5 py-2 border rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(createModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[999999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editBanner ? "Edit Banner" : "Create New Banner"}
                </h2>
                <button
                  onClick={() => {
                    setCreateModal(false);
                    resetForm();
                    setEditBanner(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      setFormErrors((prev) => ({ ...prev, title: undefined }));
                    }}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                      formErrors.title ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="e.g. Summer Sale 2025"
                  />
                  {formErrors.title && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link URL (optional)
                  </label>
                  <input
                    type="url"
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                    placeholder="https://example.com/offer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Banner Image {editBanner ? "(leave empty to keep current)" : <span className="text-red-500">*</span>}
                  </label>

                  {preview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm inline-block">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-w-full h-56 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreview("");
                          setForm({ ...form, image: null });
                        }}
                        className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full shadow hover:bg-red-700 transition"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-indigo-500 transition group">
                      <Upload size={40} className="text-gray-400 group-hover:text-indigo-500 mb-3 transition" />
                      <span className="text-sm font-medium text-gray-500 group-hover:text-indigo-600">
                        Click to upload or drag & drop
                      </span>
                      <span className="text-xs text-gray-400 mt-1">PNG, JPG, max 5MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                  {formErrors.image && (
                    <p className="mt-2 text-sm text-red-600">{formErrors.image}</p>
                  )}
                </div>

                {editBanner && (
                  <p className="text-sm text-gray-500 italic">
                    Current position: <strong>#{editBanner.position}</strong> (auto preserved)
                  </p>
                )}

                <div className="flex gap-4 pt-6">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow transition disabled:opacity-60"
                  >
                    {actionLoading && <Loader2 size={18} className="animate-spin" />}
                    {editBanner ? "Update Banner" : "Create Banner"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateModal(false);
                      resetForm();
                      setEditBanner(null);
                    }}
                    className="flex-1 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteBanner && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <AlertCircle className="w-20 h-20 text-red-600 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Delete Banner?</h3>
            <p className="text-gray-600 mb-8">
              "{deleteBanner.title}" will be permanently removed.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setDeleteBanner(null)}
                disabled={actionLoading}
                className="px-8 py-3 border rounded-xl hover:bg-gray-50 font-medium transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow transition disabled:opacity-60 flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={18} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}