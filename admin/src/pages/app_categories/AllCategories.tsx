import React, { useEffect, useState, useCallback } from "react";
import axios, { AxiosError, isAxiosError } from "axios";
import Swal from "sweetalert2";

const API_URL = "https://www.dikapi.olyox.in/api/assets";

// ─── Types ────────────────────────────────────────────────────────────────
interface Category {
  id: number;
  title: string;
  subtitle?: string;
  icon?: string;
  screen?: string;
  filter?: string;
  gradient?: [string, string];
  students?: string;
  display_order: number;
  coming_soon?: boolean;
  comingSoon?: boolean; // sometimes API returns this field name
}

interface FormData {
  title: string;
  subtitle: string;
  icon: string;
  screen: string;
  filter_key: string;
  gradient_start: string;
  gradient_end: string;
  coming_soon: boolean;
  students_label: string;
  display_order: number;
}

const initialForm: FormData = {
  title: "",
  subtitle: "",
  icon: "",
  screen: "",
  filter_key: "",
  gradient_start: "",
  gradient_end: "",
  coming_soon: false,
  students_label: "",
  display_order: 0,
};

const AllCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  // ─── Fetch Categories ─────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get<{ success: boolean; data: Category[] }>(
        `${API_URL}/category`,
      );

      if (res.data.success) {
        setCategories(res.data.data || []);
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (err: unknown) {
      let message = "Failed to load categories";

      if (isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        message =
          axiosErr.response?.data?.message || axiosErr.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Form Handlers ────────────────────────────────────────────────────────
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox" || type === "radio") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setEditingId(null);
    setShowModal(false);
  }, []);

  // ─── Submit (Create / Update) ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      Swal.fire("Validation Error", "Title is required", "warning");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        filter: form.filter_key, // API expects 'filter'
        students: form.students_label, // API expects 'students'
        gradient: [form.gradient_start, form.gradient_end].filter(Boolean),
      };

      if (editingId) {
        await axios.put(`${API_URL}/category/${editingId}`, payload);
        Swal.fire("Success", "Category updated!", "success");
      } else {
        await axios.post(`${API_URL}/category`, payload);
        Swal.fire("Success", "Category created!", "success");
      }

      resetForm();
      fetchCategories();
    } catch (err: unknown) {
      let message = "Action failed. Please try again.";

      if (isAxiosError(err)) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        message =
          axiosErr.response?.data?.message || axiosErr.message || message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      Swal.fire("Error", message, "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit Category ────────────────────────────────────────────────────────
  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      title: cat.title || "",
      subtitle: cat.subtitle || "",
      icon: cat.icon || "",
      screen: cat.screen || "",
      filter_key: cat.filter || "",
      gradient_start: cat.gradient?.[0] || "",
      gradient_end: cat.gradient?.[1] || "",
      coming_soon: cat.coming_soon ?? cat.comingSoon ?? false,
      students_label: cat.students || "",
      display_order: cat.display_order || 0,
    });
    setShowModal(true);
  };

  // ─── Disable (Soft Delete) ────────────────────────────────────────────────
  const handleDisable = async (id: number) => {
    const result = await Swal.fire({
      title: "Disable Category?",
      text: "It will be hidden from users but kept in database.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, disable",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.put(`${API_URL}/category/disable/${id}`);
      fetchCategories();
      Swal.fire("Disabled!", "Category has been disabled.", "success");
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.message ?? "Failed to disable category")
        : "Failed to disable category";

      Swal.fire("Error", message, "error");
    }
  };

  // ─── Hard Delete ──────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Delete permanently?",
      text: "This action cannot be undone!",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/category/${id}`);
      fetchCategories();
      Swal.fire(
        "Deleted!",
        "Category has been permanently deleted.",
        "success",
      );
    } catch (err: unknown) {
    const message = axios.isAxiosError(err)
  ? err.response?.data?.message ?? "Failed to delete category"
  : "Failed to delete category";

Swal.fire("Error", message, "error");
    }
  };

  // ─── Reorder Categories ───────────────────────────────────────────────────
  const updateOrder = async () => {
    if (categories.length === 0) return;

    const payload = categories.map((c, i) => ({
      id: c.id,
      display_order: i + 1,
    }));

    try {
      await axios.put(`${API_URL}/category/reorder/all`, { orders: payload });
      Swal.fire("Success", "Display order updated!", "success");
      fetchCategories();
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
  ? err.response?.data?.message ?? "Failed to update order"
  : "Failed to update order";

Swal.fire("Error", message, "error");

    }
  };

  // ─── Auto-calculate next display order for new category ───────────────────
  const getNextDisplayOrder = useCallback(() => {
    if (categories.length === 0) return 1;
    return Math.max(...categories.map((c) => c.display_order || 0)) + 1;
  }, [categories]);

  // When opening create modal → auto set display_order
  const openCreateModal = () => {
    setForm({
      ...initialForm,
      display_order: getNextDisplayOrder(),
    });
    setEditingId(null);
    setShowModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Category Management
        </h1>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-md transition"
        >
          + Add New Category
        </button>
      </div>

      {/* Table / Loading */}
      {loading && categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Loading categories...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Icon</th>
                  <th className="px-6 py-4">Screen</th>
                  <th className="px-6 py-4">Gradient</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, index) => (
                  <tr key={cat.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{index + 1}</td>
                    <td className="px-6 py-4">{cat.title}</td>
                    <td className="px-6 py-4 font-mono">{cat.icon || "-"}</td>
                    <td className="px-6 py-4">{cat.screen || "-"}</td>
                    <td className="px-6 py-4">
                      {cat.gradient?.[0] && cat.gradient?.[1] ? (
                        <span
                          className="inline-block w-10 h-5 rounded shadow-sm"
                          style={{
                            background: `linear-gradient(90deg, ${cat.gradient[0]}, ${cat.gradient[1]})`,
                          }}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cat.coming_soon || cat.comingSoon ? (
                        <span className="text-orange-600 font-medium">
                          Coming Soon
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDisable(cat.id)}
                        className="text-yellow-600 hover:text-yellow-800 font-medium"
                      >
                        Disable
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save Order */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={updateOrder}
          disabled={loading || categories.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md transition disabled:opacity-50"
        >
          Save Display Order
        </button>
      </div>

      {/* ─── MODAL ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingId ? "Edit Category" : "Create New Category"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Title */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={form.subtitle}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (Feather name)
                </label>
                <input
                  type="text"
                  name="icon"
                  value={form.icon}
                  onChange={handleChange}
                  placeholder="book-open, award, zap..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Screen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screen / Route
                </label>
                <input
                  type="text"
                  name="screen"
                  value={form.screen}
                  onChange={handleChange}
                  placeholder="/quizzes, /test-series..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filter Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter Key
                </label>
                <input
                  type="text"
                  name="filter_key"
                  value={form.filter_key}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Gradient */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gradient
                </label>
                <div
                  className="w-full h-20 rounded-lg shadow-inner mb-4 border border-gray-200"
                  style={{
                    background: `linear-gradient(90deg, ${form.gradient_start || "#a78bfa"}, ${form.gradient_end || "#ec4899"})`,
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      Start Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        name="gradient_start"
                        value={form.gradient_start || "#a78bfa"}
                        onChange={handleChange}
                        className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        name="gradient_start"
                        value={form.gradient_start}
                        onChange={handleChange}
                        placeholder="#a78bfa"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      End Color
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        name="gradient_end"
                        value={form.gradient_end || "#ec4899"}
                        onChange={handleChange}
                        className="w-12 h-10 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        name="gradient_end"
                        value={form.gradient_end}
                        onChange={handleChange}
                        placeholder="#ec4899"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Coming Soon */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Coming Soon?
                </label>
                <div className="flex items-center gap-8 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coming_soon"
                      checked={form.coming_soon === true}
                      onChange={() =>
                        setForm((p) => ({ ...p, coming_soon: true }))
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coming_soon"
                      checked={form.coming_soon === false}
                      onChange={() =>
                        setForm((p) => ({ ...p, coming_soon: false }))
                      }
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              {/* Students Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Students Label
                </label>
                <input
                  type="text"
                  name="students_label"
                  value={form.students_label}
                  onChange={handleChange}
                  placeholder="e.g. 12k+ students enrolled"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={form.display_order}
                  onChange={handleChange}
                  min={1}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
                {!editingId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Suggested: {getNextDisplayOrder()}
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="col-span-2 flex justify-end gap-4 mt-8">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={`px-6 py-2.5 text-white rounded-lg min-w-[140px] transition ${
                    loading
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {loading
                    ? "Saving..."
                    : editingId
                      ? "Update Category"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllCategories;
