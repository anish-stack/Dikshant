import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { Skeleton } from "../../../components/ui/Skeleton/Skeleton";
import { Plus, Search, Edit, Trash2, AlertCircle, X } from "lucide-react";
import Label from "../../../components/form/Label";

const API_URL = "https://www.dikapi.olyox.in/api/subjects";

interface Subject {
  id: number;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const AllSubject = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination (Frontend only)
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<Subject | null>(null);
  const [deleteModal, setDeleteModal] = useState<Subject | null>(null);

  // Form states
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
const res = await axios.get<Subject[]>(API_URL);

const sortedData = res.data.sort(
  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
);

setSubjects(sortedData);
setFilteredSubjects(sortedData);

    } catch (error) {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Frontend search
  useEffect(() => {
    const filtered = subjects.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSubjects(filtered);
    setCurrentPage(1);
  }, [searchTerm, subjects]);

  // Pagination
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const paginated = filteredSubjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Name is required");

    setSubmitting(true);
    try {
      await axios.post(API_URL, {
        name: formData.name,
        slug: generateSlug(formData.name),
        description: formData.description || "",
      });
      toast.success("Subject created!");
      setCreateModal(false);
      setFormData({ name: "", description: "" });
      fetchSubjects();
    } catch (error: any) {
        console.log(error)
      toast.error(error.response?.data?.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    setSubmitting(true);
    try {
      await axios.put(`${API_URL}/${editModal.id}`, {
        name: formData.name,
        slug: generateSlug(formData.name),
        description: formData.description || "",
      });
      toast.success("Subject updated!");
      setEditModal(null);
      setFormData({ name: "", description: "" });
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    try {
      await axios.delete(`${API_URL}/${deleteModal.id}`);
      toast.success("Subject deleted!");
      setDeleteModal(null);
      fetchSubjects();
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const openEditModal = (subject: Subject) => {
    setFormData({ name: subject.name, description: subject.description });
    setEditModal(subject);
  };

  return (
    <>
      <PageMeta title="All Subjects | Admin Dashboard" description="" />
      <PageBreadcrumb pageTitle="All Subjects" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 lg:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              All Subjects ({subjects.length})
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage all subjects
            </p>
          </div>
          <Button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create New Subject
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                <TableCell isHeader>Name</TableCell>
                <TableCell isHeader>Slug</TableCell>
                <TableCell isHeader>Description</TableCell>
                <TableCell isHeader className="text-center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-6 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-96" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-10 w-32 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-16 text-gray-500"
                  >
                    No subjects found
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((subject) => (
                  <TableRow
                    key={subject.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="font-medium">
                      {subject.name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 font-mono">
                      {subject.slug}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 line-clamp-2">
                      {subject.description || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(subject)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteModal(subject)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-xl p-4 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))
            : paginated.map((subject) => (
                <div
                  key={subject.id}
                  className="border rounded-xl p-5 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg">{subject.name}</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(subject)}
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600"
                        onClick={() => setDeleteModal(subject)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-gray-600">
                    {subject.slug}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {subject.description || "No description"}
                  </p>
                </div>
              ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Create New Subject</h2>
              <button
                onClick={() => setCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="space-y-5">
                <div>
                  <Label >Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    
                  />
                </div>
                <div className="relative">
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 pt-6 pb-3 text-base placeholder-transparent bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none peer"
                    placeholder="Description"
                    id="description"
                  />
                  <label
                    htmlFor="description"
                    className="absolute left-4 top-3 text-sm text-gray-500 dark:text-gray-400 pointer-events-none transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-6 peer-focus:top-3 peer-focus:text-sm peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                  >
                    Description
                  </label>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Creating..." : "Create Subject"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit Subject</h2>
              <button
                onClick={() => setEditModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="space-y-5">
                <div>
                  <Label >Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    
                  />
                </div>
                <div className="relative">
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-4 pt-6 pb-3 text-base placeholder-transparent bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none peer"
                    placeholder="Description"
                    id="description"
                  />
                  <label
                    htmlFor="description"
                    className="absolute left-4 top-3 text-sm text-gray-500 dark:text-gray-400 pointer-events-none transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-6 peer-focus:top-3 peer-focus:text-sm peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                  >
                    Description
                  </label>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Updating..." : "Update Subject"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModal(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Delete Subject?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Are you sure you want to delete "
              <strong>{deleteModal.name}</strong>"? This cannot be undone.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleDelete}>
                Yes, Delete
              </Button>
              <Button variant="outline" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllSubject;
