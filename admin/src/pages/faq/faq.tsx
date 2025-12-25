"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
// import PageMeta from "../../../components/common/PageMeta";
// import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
// import Input from "../../../components/form/input/InputField";
// import Button from "../../../components/ui/button/Button";
// import { Skeleton } from "../../../components/ui/Skeleton/Skeleton";
import { Plus, Search, Edit, Trash2, AlertCircle, X } from "lucide-react";
// import Label from "../../../components/form/Label";
import { 
    TableHeader,
    Table,
  TableBody,
  TableRow,
  TableCell,
 } from "../../components/ui/table";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { Skeleton } from "../../components/ui/Skeleton/Skeleton";
import Label from "../../components/form/Label";

/* =========================
   API
========================= */
const API_URL = "https://www.dikapi.olyox.in/api/faqs";

/* =========================
   TYPES
========================= */
interface FAQ {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

/* =========================
   COMPONENT
========================= */
const FAQPage = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState<FAQ | null>(null);
  const [deleteModal, setDeleteModal] = useState<FAQ | null>(null);

  // Form
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
  });
  const [submitting, setSubmitting] = useState(false);

  /* =========================
     FETCH FAQS
  ========================= */
  const fetchFaqs = async () => {
    setLoading(true);
    try {
      const res = await axios.get<FAQ[]>(API_URL);

      const sorted = res.data.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setFaqs(sorted);
      setFilteredFaqs(sorted);
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  /* =========================
     SEARCH FILTER
  ========================= */
  useEffect(() => {
    const filtered = faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.answer.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFaqs(filtered);
    setCurrentPage(1);
  }, [searchTerm, faqs]);

  /* =========================
     PAGINATION
  ========================= */
  const totalPages = Math.ceil(filteredFaqs.length / itemsPerPage);
  const paginatedFaqs = filteredFaqs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* =========================
     CREATE FAQ
  ========================= */
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim()) {
      return toast.error("Question is required");
    }

    setSubmitting(true);
    try {
      await axios.post(API_URL, {
        question: formData.question,
        answer: formData.answer,
      });

      toast.success("FAQ created successfully");
      setCreateModal(false);
      setFormData({ question: "", answer: "" });
      fetchFaqs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     UPDATE FAQ
  ========================= */
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;

    setSubmitting(true);
    try {
      await axios.put(`${API_URL}/${editModal.id}`, {
        question: formData.question,
        answer: formData.answer,
      });

      toast.success("FAQ updated successfully");
      setEditModal(null);
      setFormData({ question: "", answer: "" });
      fetchFaqs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     DELETE FAQ
  ========================= */
  const handleDelete = async () => {
    if (!deleteModal) return;

    try {
      await axios.delete(`${API_URL}/${deleteModal.id}`);
      toast.success("FAQ deleted successfully");
      setDeleteModal(null);
      fetchFaqs();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* =========================
     EDIT MODAL OPEN
  ========================= */
  const openEditModal = (faq: FAQ) => {
    setFormData({
      question: faq.question,
      answer: faq.answer,
    });
    setEditModal(faq);
  };

  /* =========================
     UI
  ========================= */
  return (
    <>
      <PageMeta title="FAQ Management | Admin" description="" />
      <PageBreadcrumb pageTitle="FAQs" />

      <div className="rounded-2xl border bg-white p-5 lg:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              FAQs ({faqs.length})
            </h1>
            <p className="text-gray-500 mt-1">
              Manage frequently asked questions
            </p>
          </div>
          <Button onClick={() => setCreateModal(true)}>
            <Plus className="w-5 h-5 mr-2" /> Add FAQ
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* TABLE */}
        <div className="hidden lg:block rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Question</TableCell>
                <TableCell isHeader>Answer</TableCell>
                <TableCell isHeader className="text-center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-72" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedFaqs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-16">
                    No FAQs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFaqs.map((faq) => (
                  <TableRow key={faq.id}>
                    <TableCell className="font-medium">
                      {faq.question}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 line-clamp-2">
                      {faq.answer || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(faq)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => setDeleteModal(faq)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-4">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="py-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* CREATE / EDIT / DELETE MODALS */}
      {(createModal || editModal) && (
        <Modal
          title={editModal ? "Edit FAQ" : "Create FAQ"}
          onClose={() => {
            setCreateModal(false);
            setEditModal(null);
          }}
        >
          <form onSubmit={editModal ? handleUpdate : handleCreate}>
            <div className="space-y-4">
              <div>
                <Label >Question</Label>
                <Input
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                //   required
                />
              </div>
              <div>
                <Label>Answer</Label>
                <textarea
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                  rows={4}
                  className="w-full border rounded-xl p-3"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button disabled={submitting} className="flex-1">
                {submitting ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModal(false);
                  setEditModal(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteModal && (
        <Modal onClose={() => setDeleteModal(null)}>
          <AlertCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-4 text-center">
            Delete FAQ?
          </h3>
          <p className="text-center mb-6">
            Are you sure you want to delete this FAQ?
          </p>
          <div className="flex gap-4">
            <Button onClick={handleDelete}>
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default FAQPage;

/* =========================
   MODAL COMPONENT
========================= */
const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
    <div className="bg-white rounded-2xl p-6 max-w-lg w-full relative">
      {title && (
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
      {children}
    </div>
  </div>
);
