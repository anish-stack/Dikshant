import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import { Edit, Trash2, PlusCircle, Loader2 } from "lucide-react";
import { API_URL } from "../../constant/constant";

interface Category {
    id: number;
    name: string;
    slug: string;
    status: string;
    createdAt?: string;
}

const AllStudyMaterialsCategories: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", status: "active" });
    const [submitting, setSubmitting] = useState(false);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/study-materials/categories?admin=true`);
            setCategories(res.data.data || []);
        } catch (error) {
            toast.error("Failed to fetch categories");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const openModal = (cat?: Category) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({ name: cat.name, status: cat.status });
        } else {
            setEditingCategory(null);
            setFormData({ name: "", status: "active" });
        }
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return toast.error("Category name is required");

        setSubmitting(true);
        try {
            if (editingCategory) {
                await axios.put(`${API_URL}/study-materials/categories/${editingCategory.id}`, formData);
                toast.success("Category updated successfully");
            } else {
                await axios.post(`${API_URL}/study-materials/categories`, formData);
                toast.success("Category created successfully");
            }
            closeModal();
            fetchCategories();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number, name: string) => {
        const result = await Swal.fire({
            title: "Are you sure?",
            text: `Delete category "${name}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Yes, delete it!",
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/study-materials/categories/${id}`);
                toast.success("Category deleted");
                fetchCategories();
            } catch (error: any) {
                toast.error(error.response?.data?.message || "Failed to delete");
            }
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <Toaster position="top-right" />

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Study Material Categories</h1>
                    <p className="text-gray-600 mt-1">Manage all categories</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                    <PlusCircle size={20} />
                    Add New Category
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left">Name</th>
                                <th className="px-6 py-4 text-left">Slug</th>
                                <th className="px-6 py-4 text-left">Status</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {categories.map((cat) => (
                                <tr key={cat.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-5 font-medium">{cat.name}</td>
                                    <td className="px-6 py-5 text-gray-500">{cat.slug}</td>
                                    <td className="px-6 py-5">
                                        <span className={`px-3 py-1 rounded-full text-sm ${cat.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                            {cat.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 flex justify-center gap-4">
                                        <button onClick={() => openModal(cat)} className="text-blue-600 hover:text-blue-800">
                                            <Edit size={20} />
                                        </button>
                                        <button onClick={() => handleDelete(cat.id, cat.name)} className="text-red-600 hover:text-red-800">
                                            <Trash2 size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-12 text-gray-500">No categories found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-8">
                        <h2 className="text-2xl font-semibold mb-6">
                            {editingCategory ? "Edit Category" : "Create New Category"}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-5">
                                <label className="block text-sm font-medium mb-2">Category Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter category name"
                                    required
                                />
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-medium mb-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 border border-gray-300 rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {submitting && <Loader2 className="animate-spin" size={20} />}
                                    {editingCategory ? "Update Category" : "Create Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllStudyMaterialsCategories;