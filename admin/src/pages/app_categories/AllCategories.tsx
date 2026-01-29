import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

const API_URL = "https://www.dikapi.olyox.in/api/assets";

const initialForm = {
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

const AllCategories = () => {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ─── Fetch all categories ────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/category`);

      setCategories(res.data.data || []);
    } catch (err) {
      Swal.fire("Error", "Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // ─── Form handlers ───────────────────────────────────────────────
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowModal(false);
  };

  // ─── Create / Update ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (editingId) {
        await axios.put(`${API_URL}/category/${editingId}`, form);
        Swal.fire("Success", "Category updated!", "success");
      } else {
        await axios.post(`${API_URL}/category`, form);
        Swal.fire("Success", "Category created!", "success");
      }

      resetForm();
      fetchCategories();
    } catch (err) {
      Swal.fire("Error", "Action failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────
  const handleEdit = (cat) => {
    console.log(cat);
    setEditingId(cat.id);
    setForm({
      title: cat.title || "",
      subtitle: cat.subtitle || "",
      icon: cat.icon || "",
      coming_soon: cat.coming_soon || false,
      screen: cat.screen || "",
      filter_key: cat.filter || "",
      gradient_start: cat.gradient?.[0] || "",
      gradient_end: cat.gradient?.[1] || "",
      students_label: cat.students || "",
      display_order: cat.display_order || 0,
    });
    setShowModal(true);
  };

  // ─── Soft Disable ────────────────────────────────────────────────
  const handleDisable = async (id) => {
    const result = await Swal.fire({
      title: "Disable Category?",
      text: "It will be hidden from users but kept in database.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, disable",
    });

    if (result.isConfirmed) {
      await axios.put(`${API_URL}/category/disable/${id}`);
      fetchCategories();
      Swal.fire("Disabled!", "Category has been disabled.", "success");
    }
  };

  // ─── Hard Delete ─────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete permanently?",
      text: "This action cannot be undone!",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it",
    });

    if (result.isConfirmed) {
      await axios.delete(`${API_URL}/category/${id}`);
      fetchCategories();
      Swal.fire(
        "Deleted!",
        "Category has been permanently deleted.",
        "success",
      );
    }
  };

  // ─── Reorder (save current order) ────────────────────────────────
  const updateOrder = async () => {
    const payload = categories.map((c, i) => ({
      id: c.id,
      display_order: i + 1,
    }));

    try {
      await axios.put(`${API_URL}/category/reorder/all`, { orders: payload });
      Swal.fire("Success", "Display order updated!", "success");
    } catch (err) {
      Swal.fire("Error", "Failed to update order", "error");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Category Management
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-md transition"
        >
          + Add New Category
        </button>
      </div>

      {/* ─── TABLE ──────────────────────────────────────────────────────── */}
      {loading && categories.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Loading categories...
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
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
                    <td className="px-6 py-4 font-mono">{cat.icon}</td>
                    <td className="px-6 py-4">{cat.screen}</td>
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
                      {cat.comingSoon ? (
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

      {/* ─── Save Order Button ──────────────────────────────────────────────── */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={updateOrder}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md transition"
        >
          Save Display Order
        </button>
      </div>

      {/* ─── MODAL ──────────────────────────────────────────────────────────── */}
      {/* ─── MODAL ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[999999] p-1">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingId ? "Edit Category" : "Create New Category"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5"
            >
              {/* Title */}
              <div className="flex flex-col col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Subtitle */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={form.subtitle}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Icon */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Icon (Feather name)
                </label>
                <input
                  type="text"
                  name="icon"
                  value={form.icon}
                  onChange={handleChange}
                  placeholder="e.g. book-open, award, zap"
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Screen / Route */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Screen / Route
                </label>
                <input
                  type="text"
                  name="screen"
                  value={form.screen}
                  onChange={handleChange}
                  placeholder="e.g. /quizzes, /test-series"
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filter Key */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Filter Key
                </label>
                <input
                  type="text"
                  name="filter_key"
                  value={form.filter_key}
                  onChange={handleChange}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Gradient Picker + Preview */}
              <div className="flex flex-col col-span-2">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Gradient Preview
                </label>
                <div
                  className="w-full h-20 rounded-lg shadow-inner mb-3 border border-gray-200"
                  style={{
                    background: `linear-gradient(90deg, ${form.gradient_start || "#a78bfa"}, ${form.gradient_end || "#ec4899"})`,
                  }}
                />
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Start Color
                    </label>
                    <div className="flex items-center gap-3">
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
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      End Color
                    </label>
                    <div className="flex items-center gap-3">
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
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Students Label */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Students Label
                </label>
                <input
                  type="text"
                  name="students_label"
                  value={form.students_label}
                  onChange={handleChange}
                  placeholder="e.g. 12k+ students"
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Is Coming Soon?
                </label>
                <div className="flex items-center gap-6 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coming_soon"
                      value="true"
                      checked={form.coming_soon}
                      onChange={() => setForm({ ...form, coming_soon: true })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Yes</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="coming_soon"
                      value="false"
                      checked={form.coming_soon === false}
                      onChange={() => setForm({ ...form, coming_soon: false })}
                      className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">No</span>
                  </label>
                </div>
              </div>
              {/* Display Order – auto calculated for new */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  name="display_order"
                  value={form.display_order}
                  onChange={handleChange}
                  min="1"
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                  // You can make it readOnly={!editingId} if you want to force auto-order
                />
                {!editingId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-set to next position ({categories.length + 1})
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="col-span-1 md:col-span-2 flex justify-end gap-4 mt-6">
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
                  className={`px-6 py-2.5 text-white rounded-lg transition min-w-[140px] ${
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
