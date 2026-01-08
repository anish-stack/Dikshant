import React, { useEffect, useState, useMemo } from "react";
import axios, { isAxiosError } from "axios";
import { API_URL } from "../../constant/constant";
import CategorySelector from "./CategorySelector";

interface Scholarship {
  id: number;
  name: string;
  description: string | null;
  applyStatus: "UPCOMING" | "ONGOING" | "CLOSED";
  category: string; // stored as JSON string in DB
  offeredCourseIds: string | null; // JSON string
  discountPercentage: number;
  noOfQuestions: number;
  duration: number;
}

const ITEMS_PER_PAGE = 8;

const ScholarshipAdmin: React.FC = () => {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Filters & Pagination
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  // Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);

  const [formData, setFormData] = useState<Partial<Scholarship>>({
    name: "",
    description: "",
    applyStatus: "UPCOMING",
    category: '["GEN"]',
    offeredCourseIds: null,
    discountPercentage: 100,
    noOfQuestions: 0,
    duration: 0,
  });

  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get<{ success: boolean; data: Scholarship[]; message?: string }>(
        `${API_URL}/scholarships`
      );

      if (response.data.success) {
        setScholarships(response.data.data);
      } else {
        setError(response.data.message || "Failed to load scholarships");
      }
    } catch (err) {
      setError(isAxiosError(err) ? err.response?.data?.message || err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(editingScholarship?.id || 0);

    try {
      if (editingScholarship) {
        // Update
        await axios.put(
          `${API_URL}/scholarships/${editingScholarship.id}`,
          formData,
          getAuthHeaders()
        );
      } else {
        // Create
        await axios.post(`${API_URL}/scholarships`, formData, getAuthHeaders());
      }

      await fetchScholarships();
      closeModal();
    } catch (err) {
      alert(editingScholarship ? "Failed to update scholarship" : "Failed to create scholarship");
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this scholarship?")) return;

    setActionLoading(id);
    try {
      await axios.delete(`${API_URL}/scholarships/${id}`, getAuthHeaders());
      setScholarships((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert("Failed to delete scholarship");
    } finally {
      setActionLoading(null);
    }
  };

  const openCreateModal = () => {
    setEditingScholarship(null);
    setFormData({
      name: "",
      description: "",
      applyStatus: "UPCOMING",
      category: '["GEN"]',
      offeredCourseIds: null,
      discountPercentage: 100,
      noOfQuestions: 0,
      duration: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (sch: Scholarship) => {
    setEditingScholarship(sch);
    setFormData({
      name: sch.name,
      description: sch.description || "",
      applyStatus: sch.applyStatus,
      category: sch.category,
      offeredCourseIds: sch.offeredCourseIds,
      discountPercentage: sch.discountPercentage,
      noOfQuestions: sch.noOfQuestions,
      duration: sch.duration,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingScholarship(null);
  };

  // Client-side filtering
  const filteredScholarships = useMemo(() => {
    if (!filter) return scholarships;

    const lowerFilter = filter.toLowerCase();
    return scholarships.filter((s) => {
      const categories = JSON.parse(s.category).join(", ").toLowerCase();
      return (
        s.applyStatus.toLowerCase().includes(lowerFilter) ||
        s.name.toLowerCase().includes(lowerFilter) ||
        categories.includes(lowerFilter)
      );
    });
  }, [scholarships, filter]);

  // Pagination
  const totalPages = Math.ceil(filteredScholarships.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredScholarships.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredScholarships, page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONGOING": return "bg-green-100 text-green-800";
      case "UPCOMING": return "bg-blue-100 text-blue-800";
      case "CLOSED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Manage Scholarships</h2>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Create New Scholarship
        </button>
      </div>

      {/* Filter */}
      <input
        type="text"
        placeholder="Search by name, status, or category..."
        value={filter}
        onChange={(e) => { setFilter(e.target.value); setPage(1); }}
        className="w-full md:w-96 mb-6 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Loading / Error / Empty */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scholarships...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      ) : filteredScholarships.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl">
          <p className="text-xl text-gray-600">No scholarships found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Questions / Duration</th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((sch) => (
                  <tr key={sch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">#{sch.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{sch.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(sch.applyStatus)}`}>
                        {sch.applyStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {JSON.parse(sch.category).join(", ")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{sch.discountPercentage}%</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {sch.noOfQuestions} Qs / {sch.duration} min
                    </td>
                    <td className="px-6 py-4 text-center space-x-2">
                      <button
                        onClick={() => openEditModal(sch)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(sch.id)}
                        disabled={actionLoading === sch.id}
                        className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                      >
                        {actionLoading === sch.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="block md:hidden space-y-4">
            {paginatedData.map((sch) => (
              <div key={sch.id} className="bg-white p-5 rounded-lg shadow border">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">#{sch.id} - {sch.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{sch.description || "No description"}</p>
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(sch.applyStatus)}`}>
                    {sch.applyStatus}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                  <div><strong>Category:</strong> {JSON.parse(sch.category).join(", ")}</div>
                  <div><strong>Discount:</strong> {sch.discountPercentage}%</div>
                  <div><strong>Questions:</strong> {sch.noOfQuestions}</div>
                  <div><strong>Duration:</strong> {sch.duration} min</div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => openEditModal(sch)} className="text-blue-600 font-medium">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(sch.id)}
                    className="text-red-600 font-medium"
                    disabled={actionLoading === sch.id}
                  >
                    {actionLoading === sch.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8 gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999999] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto p-6">
            <h3 className="text-2xl font-bold mb-6">
              {editingScholarship ? "Edit Scholarship" : "Create New Scholarship"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.applyStatus}
                    onChange={(e) => setFormData({ ...formData, applyStatus: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                  <input
                    type="text"
                    min="0"
                    max="100"
                    value={formData.discountPercentage}
                    onChange={(e) => setFormData({ ...formData, discountPercentage: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
<CategorySelector
    value={formData.category || '[]'}
    onChange={(jsonString) => setFormData({ ...formData, category: jsonString })}
  />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">No. of Questions</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.noOfQuestions}
                    onChange={(e) => setFormData({ ...formData, noOfQuestions: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading !== null}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
                >
                  {actionLoading ? "Saving..." : editingScholarship ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipAdmin;