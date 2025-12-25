import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Upload, X, AlertCircle } from "lucide-react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

const API_URL = "https://www.dikapi.olyox.in/api/banners";

interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: number;
  status: boolean;
  createdAt: string;
}

const Banner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [filtered, setFiltered] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<Banner | null>(null);
  const [deleteItem, setDeleteItem] = useState<Banner | null>(null);

  // Form
  const [form, setForm] = useState({ title: "", linkUrl: "", image: null as File | null });
  const [preview, setPreview] = useState("");

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Banner[]>(API_URL);
      const sorted = res.data.sort((a, b) => a.position - b.position);
      setBanners(sorted);
      setFiltered(sorted);
    } catch {
      toast.error("Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  // Search
  useEffect(() => {
    const filtered = banners.filter(b =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.linkUrl.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(filtered);
    setPage(1);
  }, [search, banners]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const nextPosition = banners.length > 0 ? Math.max(...banners.map(b => b.position)) + 1 : 1;

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Image only");
    setForm({ ...form, image: file });
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title required");
    if (!form.image && !editItem) return toast.error("Image required");

    const data = new FormData();
    data.append("title", form.title);
    data.append("linkUrl", form.linkUrl);
    data.append("position", editItem ? editItem.position.toString() : nextPosition.toString());
    data.append("status", "true");
    if (form.image) data.append("image", form.image);

    try {
      if (editItem) {
        await axios.put(`${API_URL}/${editItem.id}`, data);
        toast.success("Banner updated!");
        setEditItem(null);
      } else {
        await axios.post(API_URL, data);
        toast.success("Banner created!");
        setCreateOpen(false);
      }
      setForm({ title: "", linkUrl: "", image: null });
      setPreview("");
      fetchBanners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed");
    }
  };

  const toggleStatus = async (banner: Banner) => {
    try {
      await axios.put(`${API_URL}/${banner.id}`, { status: !banner.status });
      toast.success("Status updated");
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, status: !b.status } : b));
    } catch {
      toast.error("Failed");
    }
  };

  const deleteBanner = async () => {
    if (!deleteItem) return;
    try {
      await axios.delete(`${API_URL}/${deleteItem.id}`);
      toast.success("Banner deleted");
      setDeleteItem(null);
      fetchBanners();
    } catch {
      toast.error("Failed");
    }
  };

  const openEdit = (banner: Banner) => {
    setForm({ title: banner.title, linkUrl: banner.linkUrl, image: null });
    setPreview(banner.imageUrl);
    setEditItem(banner);
  };

  return (
    <>
      <PageMeta title="Banners" description="" />
      <PageBreadcrumb pageTitle="Banners" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Banners ({banners.length})</h1>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus className="w-5 h-5" /> New Banner
          </button>
        </div>

        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search title or link..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Pos</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Image</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Link</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-8 animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="w-24 h-16 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-48 animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-6 bg-gray-200 rounded w-32 animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="h-8 w-16 bg-gray-200 rounded-full mx-auto animate-pulse" /></td>
                    <td className="px-4 py-4"><div className="flex gap-2 justify-center"><div className="w-9 h-9 bg-gray-200 rounded animate-pulse" /></div></td>
                  </tr>
                ))
              ) : paginated.map(banner => (
                <tr key={banner.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-bold text-indigo-600">#{banner.position}</td>
                  <td className="px-4 py-4">
                    <img src={banner.imageUrl} alt={banner.title} className="w-24 h-16 object-cover rounded-lg shadow" />
                  </td>
                  <td className="px-4 py-4 font-medium">{banner.title}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 truncate max-w-xs">
                    {banner.linkUrl || "—"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${banner.status ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {banner.status ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => openEdit(banner)} className="p-2 hover:bg-blue-100 rounded-lg">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </button>
                      <button onClick={() => toggleStatus(banner)} className="p-2 hover:bg-yellow-100 rounded-lg">
                        {banner.status ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-red-600" />}
                      </button>
                      <button onClick={() => setDeleteItem(banner)} className="p-2 hover:bg-red-100 rounded-lg">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-5 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Prev
            </button>
            <span className="px-5 py-2">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-5 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(createOpen || editItem) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold mb-6">{editItem ? "Edit" : "Create"} Banner</h2>
            <form onSubmit={submit} className="space-y-5">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
                required
              />
              <input
                type="url"
                placeholder="Link URL (optional)"
                value={form.linkUrl}
                onChange={e => setForm({ ...form, linkUrl: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500"
              />

              <div>
                <label className="block text-sm font-medium mb-2">Banner Image</label>
                {preview ? (
                  <div className="relative inline-block">
                    <img src={preview} alt="Preview" className="w-full max-w-md h-48 object-cover rounded-xl border" />
                    <button type="button" onClick={() => { setPreview(""); setForm({ ...form, image: null }); }} className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer hover:border-indigo-500">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <input type="file" accept="image/*" onChange={handleImage} className="hidden" required={!editItem} />
                  </label>
                )}
              </div>

              {editItem && <p className="text-sm text-gray-500">Position: #{editItem.position} (auto-managed)</p>}

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
                  {editItem ? "Update" : "Create"} Banner
                </button>
                <button type="button" onClick={() => { setCreateOpen(false); setEditItem(null); setForm({ title: "", linkUrl: "", image: null }); setPreview(""); }} className="flex-1 py-3 border rounded-xl hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Delete Banner?</h3>
            <p className="text-gray-600 mb-8">" {deleteItem.title} "</p>
            <div className="flex gap-4 justify-center">
              <button onClick={deleteBanner} className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700">Delete</button>
              <button onClick={() => setDeleteItem(null)} className="px-6 py-3 border rounded-xl hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Banner;