import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { Edit, Trash2, PlusCircle, Loader2, FileText, Image as ImageIcon } from "lucide-react";
import { API_URL } from "../../constant/constant";

const AllStudyMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    isPaid: false,
    price: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [matRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/study-materials/materials`),
        axios.get(`${API_URL}/study-materials/categories`),
      ]);
      setMaterials(matRes.data.data || []);
      setCategories(catRes.data.data || []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", categoryId: "", isPaid: false, price: "" });
    setPdfFile(null);
    setCoverImage(null);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (mat: any) => {
    setEditing(mat);
    setForm({
      title: mat.title,
      description: mat.description || "",
      categoryId: mat.categoryId?.toString() || "",
      isPaid: mat.isPaid,
      price: mat.price?.toString() || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("categoryId", form.categoryId);
    data.append("isPaid", String(form.isPaid));
    if (form.isPaid) data.append("price", form.price);

    if (pdfFile) data.append("pdf", pdfFile);
    if (coverImage) data.append("image", coverImage);

    try {
      if (editing) {
        await axios.put(`${API_URL}/study-materials/materials/${editing.id}`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Material updated");
      } else {
        await axios.post(`${API_URL}/study-materials/materials`, data, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Material created");
      }
      setModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    const res = await Swal.fire({
      title: "Delete Material?",
      text: title,
      icon: "warning",
      confirmButtonText: "Yes, delete",
    });
    if (res.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/study-materials/materials/${id}`);
        toast.success("Deleted");
        fetchData();
      } catch (err) {
        toast.error("Delete failed");
      }
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between mb-8">
        <h1 className="text-3xl font-bold">All Study Materials</h1>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl">
          <PlusCircle size={20} /> Add New Material
        </button>
      </div>

      {/* Table similar to categories - you can expand it with file links, price, etc. */}
      {/* For brevity, showing key columns only */}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-6 py-4 text-left">Title</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Type</th>
              <th className="px-6 py-4 text-left">Price</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m) => (
              <tr key={m.id}>
                <td className="px-6 py-5 font-medium">{m.title}</td>
                <td className="px-6 py-5">{m.category?.name}</td>
                <td className="px-6 py-5">
                  {m.isPaid ? "Paid" : "Free"}
                </td>
                <td className="px-6 py-5">₹{m.price || 0}</td>
                <td className="px-6 py-5 flex gap-4 justify-center">
                  <button onClick={() => openEdit(m)}><Edit size={20} className="text-blue-600" /></button>
                  <button onClick={() => handleDelete(m.id, m.title)}><Trash2 size={20} className="text-red-600" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for Create/Edit Material - includes file upload */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6">{editing ? "Edit Material" : "Add New Study Material"}</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label>Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full border rounded-xl p-3" />
                </div>

                <div>
                  <label>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-xl p-3 h-24" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label>Category</label>
                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className="w-full border rounded-xl p-3">
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2">Is Paid?</label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={form.isPaid} onChange={(e) => setForm({ ...form, isPaid: e.target.checked })} />
                      <span>Paid Material</span>
                    </label>
                  </div>
                </div>

                {form.isPaid && (
                  <div>
                    <label>Price (₹)</label>
                    <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border rounded-xl p-3" required />
                  </div>
                )}

                <div>
                  <label>PDF File {editing && "(Leave empty to keep current)"}</label>
                  <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="w-full" />
                </div>

                <div>
                  <label>Cover Image {editing && "(Leave empty to keep current)"}</label>
                  <input type="file" accept="image/*" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} className="w-full" />
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 border rounded-2xl">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-2">
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