import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { Edit, Trash2, PlusCircle, Loader2, Eye, Download } from "lucide-react";
import JoditEditor from "jodit-react";
import { API_URL } from "../../constant/constant";

const AllStudyMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Pagination & Filter State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal & Form
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",           // long description (HTML from Jodit)
    categoryId: "",
    isPaid: false,
    price: "",
    isHardCopy: false,
    isDownloadable: true,
    featured: false,
    position: "",
    status: "active",
  });

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [samplePdfFile, setSamplePdfFile] = useState<File | null>(null);

  const editor = useRef(null);

  const joditConfig = useMemo(
    () => ({
      readonly: false,
      height: 400,
      placeholder: "Write full description here...",
      toolbarButtonSize: "middle",
      buttons: [
        "source", "|", "bold", "italic", "underline", "strikethrough", "|",
        "font", "fontsize", "brush", "paragraph", "|",
        "ul", "ol", "|", "outdent", "indent", "|",
        "link", "image", "table", "|", "align", "undo", "redo", "eraser"
      ],
    }),
    []
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (search) params.search = search;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const [matRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/study-materials/materials`, { params }),
        axios.get(`${API_URL}/study-materials/categories`),
      ]);

      setMaterials(matRes.data.data || []);
      setCategories(catRes.data.data || []);
      setTotalPages(matRes.data.pagination?.totalPages || 1);
      setTotalItems(matRes.data.pagination?.total || 0);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, search, categoryFilter, statusFilter]);

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      shortDescription: "",
      description: "",
      categoryId: "",
      isPaid: false,
      price: "",
      isHardCopy: false,
      isDownloadable: true,
      featured: false,
      position: "",
      status: "active",
    });
    setPdfFile(null);
    setCoverImage(null);
    setSamplePdfFile(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (mat: any) => {
    setEditing(mat);
    setForm({
      title: mat.title || "",
      slug: mat.slug || "",
      shortDescription: mat.shortDescription || "",
      description: mat.description || "",
      categoryId: mat.categoryId?.toString() || "",
      isPaid: mat.isPaid || false,
      price: mat.price?.toString() || "",
      isHardCopy: mat.isHardCopy || false,
      isDownloadable: mat.isDownloadable ?? true,
      featured: mat.featured || false,
      position: mat.position?.toString() || "",
      status: mat.status || "active",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const data = new FormData();
    data.append("title", form.title);
    data.append("slug", form.slug);
    data.append("shortDescription", form.shortDescription);
    data.append("description", form.description);
    data.append("categoryId", form.categoryId);
    data.append("isPaid", String(form.isPaid));
    data.append("isHardCopy", String(form.isHardCopy));
    data.append("isDownloadable", String(form.isDownloadable));
    data.append("featured", String(form.featured));
    data.append("status", form.status);
    if (form.position) data.append("position", form.position);
    if (form.isPaid && form.price) data.append("price", form.price);

    if (pdfFile) data.append("pdf", pdfFile);           // main fileUrl
    if (coverImage) data.append("image", coverImage);   // coverImage
    if (samplePdfFile) data.append("samplePdf", samplePdfFile);

    try {
      if (editing) {
        await axios.put(`${API_URL}/study-materials/materials/${editing.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Material updated successfully");
      } else {
        await axios.post(`${API_URL}/study-materials/materials`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Material created successfully");
      }
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const res = await Swal.fire({
      title: "Delete Material?",
      text: `Are you sure you want to delete "${title}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
    });

    if (res.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/study-materials/materials/${id}`);
        toast.success("Material deleted");
        fetchData();
      } catch (err) {
        toast.error("Failed to delete");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Study Materials</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
        >
          <PlusCircle size={20} /> Add New Material
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 border rounded-xl px-4 py-3"
        />

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="border rounded-xl px-4 py-3"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-xl px-4 py-3"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="border rounded-xl px-4 py-3"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-4 text-left">Cover</th>
              <th className="px-6 py-4 text-left">Title</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Type</th>
              <th className="px-6 py-4 text-left">Price</th>
              <th className="px-6 py-4 text-center">Featured</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><Loader2 className="animate-spin mx-auto" /></td></tr>
            ) : materials.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-500">No materials found</td></tr>
            ) : (
              materials.map((m) => (
                <tr key={m.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {m.coverImage && (
                      <img src={m.coverImage} alt="cover" className="w-12 h-16 object-cover rounded" />
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{m.title}</td>
                  <td className="px-6 py-4">{m.category?.name}</td>
                  <td className="px-6 py-4">
                    {m.isPaid ? "Paid" : "Free"}
                    {m.isHardCopy && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Hardcopy</span>}
                  </td>
                  <td className="px-6 py-4">₹{m.price || 0}</td>
                  <td className="px-6 py-4 text-center">
                    {m.featured ? "⭐" : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs ${m.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-3 justify-center">
                    {m.fileUrl && (
                      <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" title="View PDF">
                        <Eye size={18} className="text-blue-600" />
                      </a>
                    )}
                    <button onClick={() => openEdit(m)}>
                      <Edit size={18} className="text-blue-600" />
                    </button>
                    <button onClick={() => handleDelete(m.id, m.title)}>
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} materials
        </div>
        <div className="flex gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 border rounded-xl bg-gray-50">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 border rounded-xl disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] p-4 overflow-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-auto">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6">
                {editing ? "Edit Study Material" : "Add New Study Material"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-1 font-medium">Title *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                      className="w-full border rounded-xl p-3"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Slug</label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full border rounded-xl p-3"
                      placeholder="auto-generated-if-empty"
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Short Description</label>
                  <textarea
                    value={form.shortDescription}
                    onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                    className="w-full border rounded-xl p-3 h-20"
                    placeholder="Brief summary..."
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">Full Description (Rich Text)</label>
                  <JoditEditor
                    ref={editor}
                    value={form.description}
                    config={joditConfig}
                    onBlur={(newContent) => setForm({ ...form, description: newContent })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block mb-1 font-medium">Category *</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      required
                      className="w-full border rounded-xl p-3"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Position</label>
                    <input
                      type="number"
                      value={form.position}
                      onChange={(e) => setForm({ ...form, position: e.target.value })}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full border rounded-xl p-3"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isPaid}
                        onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                      />
                      <span className="font-medium">Is Paid Material</span>
                    </label>
                  </div>

                  {form.isPaid && (
                    <div>
                      <label className="block mb-1 font-medium">Price (₹) *</label>
                      <input
                        type="number"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                        required
                        className="w-full border rounded-xl p-3"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isHardCopy}
                      onChange={(e) => setForm({ ...form, isHardCopy: e.target.checked })}
                    />
                    <span>Hard Copy Available</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isDownloadable}
                      onChange={(e) => setForm({ ...form, isDownloadable: e.target.checked })}
                    />
                    <span>Downloadable</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    />
                    <span>Featured</span>
                  </label>
                </div>

                {/* File Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block mb-1 font-medium">
                      Main PDF {editing && "(Leave empty to keep current)"}
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      className="w-full"
                    />
                    {editing?.fileUrl && (
                      <a href={editing.fileUrl} target="_blank" className="text-blue-600 text-sm mt-1 inline-flex items-center gap-1">
                        <Download size={14} /> View current PDF
                      </a>
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">
                      Sample PDF
                    </label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setSamplePdfFile(e.target.files?.[0] || null)}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 font-medium">
                      Cover Image {editing && "(Leave empty to keep current)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
                      className="w-full"
                    />
                    {editing?.coverImage && (
                      <img src={editing.coverImage} alt="current cover" className="mt-2 w-20 h-28 object-cover rounded" />
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-8">
                  <button
                    type="button"
                    onClick={() => { setModalOpen(false); resetForm(); }}
                    className="flex-1 py-4 border rounded-2xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-70"
                  >
                    {submitting && <Loader2 className="animate-spin" />}
                    {editing ? "Update Material" : "Create Material"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllStudyMaterials;