"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import axios, { isAxiosError } from "axios";
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
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import JoditEditor from "jodit-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const API_URL = "https://www.app.api.dikshantias.com/api/announcements";

interface Announcement {
  id: number;
  title: string;
  message: string;
  removeImage: boolean; // ✅ NEW FLAG to indicate image removal,
  publishDate: string;
  WantPromote: number[] | null; // batch ids for promotion
  description: string;
  textSize: string;
  image?: string; // ✅ NEW
  arrowColor?: string; // ✅ NEW
  arrowBackgroundColor?: string; // ✅ NEW
  arrowSize?: string; // ✅ NEW
  textColor: string;
  backgroundColor: string;
  width: string;
  height: string;
  containerStyle: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Batch {
  id: number;
  name: string;
  // you can add more fields if you want to show startDate, category, etc.
}

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  // Form state - expanded with style helpers
  const [form, setForm] = useState({
    title: "",
    message: "",
    publishDate: "",
    WantPromote: [] as number[],
    description: "",
    textColor: "#000000",
    image: null as File | null,
    removeImage: false,
    imagePreview: "",
    arrowColor: "#ffffff",
    arrowBackgroundColor: "#000000",
    arrowSize: "18px",

    textSize: "16px",
    backgroundColor: "#ffffff",
    width: "100%",
    height: "auto",
    isActive: true,

    // New style control fields
    padding: "1.5rem",
    borderRadius: "0.75rem",
    border: "1px solid #e5e7eb",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    maxWidth: "100%",
    extraCustomCss: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const editorRef = useRef<JoditEditor>(null);

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
    [],
  );

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await axios.get<any>(
        `https://www.app.api.dikshantias.com/api/batchs`,
        {
          params: { page: 1, limit: 500 },
        },
      );

      // Adjust according to your real response shape
      const items = res.data?.items || res.data || [];
      setBatches(items);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setBatches([]);
      toast.error("Could not load batches");
    } finally {
      setLoadingBatches(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<Announcement[]>(
        `${API_URL}?isAdmin=true`,
      );
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime(),
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
    fetchBatches(); // ← added
  }, []);
  // Filter & Pagination
  const filteredAnnouncements = announcements.filter(
    (ann) =>
      ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const paginated = filteredAnnouncements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
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
    setForm({
      title: "",
      message: "",
      WantPromote: [],
      removeImage: false,
      publishDate: "",
      textSize: "16px",
      image: null as File | null,
      imagePreview: "",
      arrowColor: "#ffffff",
      arrowBackgroundColor: "#000000",
      arrowSize: "18px",

      description: "",
      textColor: "#000000",
      backgroundColor: "#ffffff",
      width: "100%",
      height: "auto",
      isActive: true,
      padding: "1.5rem",
      borderRadius: "0.75rem",
      border: "1px solid #e5e7eb",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      maxWidth: "100%",
      extraCustomCss: "",
    });
    setIsFormOpen(true);
  };
  const openEdit = (ann: Announcement) => {
    setIsEditMode(true);
    setEditingId(ann.id);

    let parsedWantPromote: number[] = [];

    if (ann.WantPromote) {
      if (Array.isArray(ann.WantPromote)) {
        parsedWantPromote = ann.WantPromote;
      } else if (typeof ann.WantPromote === "string") {
        try {
          parsedWantPromote = JSON.parse(ann.WantPromote);
        } catch {
          parsedWantPromote = [];
        }
      }
    }

    setForm((prev) => ({
      ...prev, // ✅ keep existing fields

      title: ann.title || "",
      arrowColor: ann.arrowColor || "#ffffff", // ✅
      arrowBackgroundColor: ann.arrowBackgroundColor || "#000000", // ✅
      arrowSize: ann.arrowSize || "18px", // ✅
      imagePreview: ann.image || "", // ✅
      message: ann.message || "",
      description: ann.description || "",

      WantPromote: parsedWantPromote, // ✅ FIXED
      //       textSize: ann.textSize || "16px",
      publishDate: ann.publishDate?.split("T")[0] || "",
      textColor: ann.textColor || "#000000",
      backgroundColor: ann.backgroundColor || "#ffffff",
      width: ann.width || "100%",
      height: ann.height || "auto",
      isActive: ann.isActive ?? true,
    }));

    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("📢 Form Submit Triggered");
    console.log("📝 Current Form State:", form);

    if (!form.title.trim() || !form.message.trim() || !form.publishDate) {
      console.warn("⚠ Validation Failed");
      return toast.error("Title, short message, and publish date are required");
    }

    setSubmitting(true);
    const formData = new FormData();
    // const payload = {
    //   title: form.title,
    //   message: form.message,
    //   publishDate: form.publishDate,
    //   description: form.description,
    //   textSize: form.textSize,
    //   textColor: form.textColor,
    //   backgroundColor: form.backgroundColor,
    //   width: form.width,
    //   WantPromote: form.WantPromote,
    //   height: form.height,
    //   isActive: form.isActive,
    // };

    formData.append("title", form.title);
    formData.append("message", form.message);
    formData.append("publishDate", form.publishDate);
    formData.append("description", form.description);
    formData.append("textSize", form.textSize);
    formData.append("textColor", form.textColor);
    formData.append("backgroundColor", form.backgroundColor);
    formData.append("width", form.width);
    formData.append("height", form.height);
    formData.append("removeImage", String(form.removeImage)); // ✅ NEW
    formData.append("arrowColor", form.arrowColor);
    formData.append("arrowBackgroundColor", form.arrowBackgroundColor);
    formData.append("arrowSize", form.arrowSize);
    formData.append("isActive", String(form.isActive));

    const safeWantPromote = Array.isArray(form.WantPromote)
      ? form.WantPromote
      : [];

    formData.append("WantPromote", JSON.stringify(safeWantPromote));

    if (form.image) {
      formData.append("image", form.image);
    }
    // console.log("📦 Payload Being Sent:", payload);
    console.log("🔗 API URL:", API_URL);

    try {
      if (isEditMode && editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        await axios.post(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      console.log("🔄 Refreshing announcements list...");
      setIsFormOpen(false);
      fetchAnnouncements();
    } catch (err) {
      if (isAxiosError(err)) {
        console.error("❌ API Error:", err);
        console.error("❌ Error Response:", err?.response?.data);

        const msg =
          err?.response?.data?.message ||
          `Failed to ${isEditMode ? "update" : "create"} announcement`;

        toast.error(msg);
      }
    } finally {
      console.log("🏁 Submit Finished");
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
      <PageMeta
        title="Announcements | Admin"
        description="Manage system announcements"
      />
      <PageBreadcrumb pageTitle="Announcements" />

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              Announcements
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {announcements.length}{" "}
              {searchTerm && `(filtered: ${filteredAnnouncements.length})`}
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
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Table (unchanged) */}
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
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-5">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 animate-pulse" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-64 animate-pulse" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-96 animate-pulse" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="h-5 w-12 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse mx-auto" />
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-3">
                          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-16 text-gray-500 dark:text-gray-400"
                    >
                      {searchTerm
                        ? "No matching announcements found"
                        : "No announcements yet"}
                    </td>
                  </tr>
                ) : (
                  paginated.map((ann) => (
                    <tr
                      key={ann.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
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
                      <td className="px-6 py-5 text-center">
                        <span
                          className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                            ann.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {ann.isActive ? "Active" : "Inactive"}
                        </span>
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
                className="px-5 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-5 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[999999] p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[94vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? "Edit Announcement" : "Create Announcement"}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 md:p-8 space-y-7"
            >
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
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none bg-white dark:bg-gray-800"
                  placeholder="Appears as headline / notification preview..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Promote to Batches (optional)
                </label>

                {loadingBatches ? (
                  <div className="text-sm text-gray-500">
                    Loading batches...
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-sm text-amber-600">
                    No batches available
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                    {batches.map((batch) => (
                      <label
                        key={batch.id}
                        className="flex items-center gap-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.WantPromote.includes(batch.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setForm((prev) => ({
                              ...prev,
                              WantPromote: checked
                                ? [...prev.WantPromote, batch.id]
                                : prev.WantPromote.filter(
                                    (id) => id !== batch.id,
                                  ),
                            }));
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {batch.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Core Styling */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Text Color
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={form.textColor}
                      onChange={(e) =>
                        setForm({ ...form, textColor: e.target.value })
                      }
                      className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.textColor}
                      onChange={(e) =>
                        setForm({ ...form, textColor: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background Color
                  </label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      value={form.backgroundColor}
                      onChange={(e) =>
                        setForm({ ...form, backgroundColor: e.target.value })
                      }
                      className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={form.backgroundColor}
                      onChange={(e) =>
                        setForm({ ...form, backgroundColor: e.target.value })
                      }
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Text Size
                  </label>
                  <input
                    type="text"
                    value={form.textSize}
                    onChange={(e) =>
                      setForm({ ...form, textSize: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder=""
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Width
                  </label>
                  <input
                    type="text"
                    value={form.width}
                    onChange={(e) =>
                      setForm({ ...form, width: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="100% | 90% | 800px"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height
                  </label>
                  <input
                    type="text"
                    value={form.height}
                    onChange={(e) =>
                      setForm({ ...form, height: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                    placeholder="auto | 400px | 50vh"
                  />
                </div>

                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, isActive: !form.isActive })
                    }
                    className={`flex items-center gap-3 px-4 py-3 border rounded-lg w-full transition ${
                      form.isActive
                        ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                        : "border-gray-300 dark:border-gray-700"
                    }`}
                  >
                    {form.isActive ? (
                      <ToggleRight className="text-green-600" size={28} />
                    ) : (
                      <ToggleLeft className="text-gray-400" size={28} />
                    )}
                    <span
                      className={
                        form.isActive
                          ? "text-green-700 dark:text-green-300"
                          : "text-gray-600 dark:text-gray-400"
                      }
                    >
                      {form.isActive ? "Active (visible)" : "Inactive (hidden)"}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Announcement Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setForm((prev) => ({
                      ...prev,
                      image: file,
                      imagePreview: URL.createObjectURL(file),
                    }));
                  }}
                  className="w-full"
                />

        {form.imagePreview && (
  <div className="mt-3 relative inline-block">
    <img
      src={form.imagePreview}
      alt="Preview"
      className="h-32 rounded-lg border"
    />

    <button
      type="button"
      onClick={() =>
        setForm((prev) => ({
          ...prev,
          image: null,
          imagePreview: "",
          removeImage: true,   // ✅ IMPORTANT FLAG
        }))
      }
      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow"
    >
      <X size={14} />
    </button>
  </div>
)}
              </div>

              {/* Arrow Color */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arrow Color
                </label>
                <input
                  type="color"
                  value={form.arrowColor}
                  onChange={(e) =>
                    setForm({ ...form, arrowColor: e.target.value })
                  }
                  className="w-12 h-10"
                />
              </div>

              {/* Arrow Background */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arrow Background
                </label>
                <input
                  type="color"
                  value={form.arrowBackgroundColor}
                  onChange={(e) =>
                    setForm({ ...form, arrowBackgroundColor: e.target.value })
                  }
                  className="w-12 h-10"
                />
              </div>

              {/* Arrow Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Arrow Size
                </label>
                <input
                  type="text"
                  value={form.arrowSize}
                  onChange={(e) =>
                    setForm({ ...form, arrowSize: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="18px"
                />
              </div>

              {/* Rich Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Description / Rich Content
                </label>
                <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <JoditEditor
                    ref={editorRef}
                    value={form.description}
                    config={joditConfig}
                    tabIndex={1}
                    onBlur={(newContent) =>
                      setForm({ ...form, description: newContent })
                    }
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
                  onChange={(e) =>
                    setForm({ ...form, publishDate: e.target.value })
                  }
                  className="w-full md:w-64 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white dark:bg-gray-800"
                  required
                />
              </div>
            </form>

            {/* Footer */}
            <div className="flex gap-4 px-6 py-5 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex-1 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                  submitting
                    ? "bg-indigo-400 text-white cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                {submitting
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Announcement"
                    : "Create Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/65 flex items-center justify-center z-[99999999] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-5" />
            <h3 className="text-xl font-bold mb-3">Delete Announcement?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              This action cannot be undone.
              <br />
              <strong className="text-gray-900 dark:text-white">
                "{deleteTarget.title}"
              </strong>
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
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
