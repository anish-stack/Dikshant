"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, Edit, X, AlertCircle, Lock } from "lucide-react";

import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../components/ui/table";
import Input from "../../components/form/input/InputField";
import Button from "../../components/ui/button/Button";
import { Skeleton } from "../../components/ui/Skeleton/Skeleton";
import Label from "../../components/form/Label";

/* =========================
   API
========================= */
const API_URL = "https://www.dikapi.olyox.in/api/doubt";

/* =========================
   TYPES
========================= */
interface Doubt {
  id: number;
  subject: string;
  question: string;
  answer: string | null;
  status: "open" | "answered" | "closed";
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
}

/* =========================
   COMPONENT
========================= */
const DoubtsAdmin = () => {
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [filtered, setFiltered] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);

  // Search + pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [answerModal, setAnswerModal] = useState<Doubt | null>(null);
  const [closeModal, setCloseModal] = useState<Doubt | null>(null);

  // Form
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* =========================
     FETCH DOUBTS
  ========================= */
  const fetchDoubts = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Doubt[]>(`${API_URL}/admin/all`);
      setDoubts(res.data);
      setFiltered(res.data);
    } catch {
      toast.error("Failed to load doubts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubts();
  }, []);

  /* =========================
     SEARCH
  ========================= */
  useEffect(() => {
    const f = doubts.filter(
      (d) =>
        d.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.question.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFiltered(f);
    setCurrentPage(1);
  }, [searchTerm, doubts]);

  /* =========================
     PAGINATION
  ========================= */
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* =========================
     ANSWER DOUBT
  ========================= */
  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !answerModal) {
      return toast.error("Answer is required");
    }

    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/admin/${answerModal.id}/answer`,
        { answer }
      );
      toast.success("Doubt answered successfully");
      setAnswerModal(null);
      setAnswer("");
      fetchDoubts();
    } catch {
      toast.error("Failed to answer doubt");
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================
     CLOSE DOUBT
  ========================= */
  const closeDoubt = async () => {
    if (!closeModal) return;

    try {
      await axios.patch(`${API_URL}/admin/${closeModal.id}/close`);
      toast.success("Doubt closed successfully");
      setCloseModal(null);
      fetchDoubts();
    } catch {
      toast.error("Failed to close doubt");
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <>
      <PageMeta title="Doubts | Admin" description="" />
      <PageBreadcrumb pageTitle="Student Doubts" />

      <div className="rounded-2xl border bg-white p-5 lg:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Doubts ({doubts.length})
            </h1>
            <p className="text-gray-500 mt-1">
              Manage and answer student doubts
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search doubts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* TABLE */}
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell isHeader>Subject</TableCell>
                <TableCell isHeader>Question</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader className="text-center">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-32 mx-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16">
                    No doubts found
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.subject}
                    </TableCell>
                    <TableCell className="line-clamp-2">
                      {d.question}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          d.status === "open"
                            ? "bg-yellow-100 text-yellow-700"
                            : d.status === "answered"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {d.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAnswerModal(d);
                            setAnswer(d.answer || "");
                          }}
                          disabled={d.status === "closed"}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          onClick={() => setCloseModal(d)}
                          disabled={d.status === "closed"}
                        >
                          <Lock className="w-4 h-4" />
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

      {/* ANSWER MODAL */}
      {answerModal && (
        <Modal title="Answer Doubt" onClose={() => setAnswerModal(null)}>
          <form onSubmit={submitAnswer}>
            <div className="space-y-4">
              <div>
                <Label>Question</Label>
                <p className="text-sm text-gray-600">
                  {answerModal.question}
                </p>
              </div>
              <div>
                <Label >Answer</Label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  className="w-full border rounded-xl p-3"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button disabled={submitting} className="flex-1">
                {submitting ? "Saving..." : "Submit Answer"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setAnswerModal(null)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CLOSE MODAL */}
      {closeModal && (
        <Modal onClose={() => setCloseModal(null)}>
          <AlertCircle className="w-14 h-14 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-4 text-center">
            Close this doubt?
          </h3>
          <p className="text-center mb-6">
            This action cannot be undone.
          </p>
          <div className="flex gap-4">
            <Button onClick={closeDoubt}>
              Yes, Close
            </Button>
            <Button variant="outline" onClick={() => setCloseModal(null)}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default DoubtsAdmin;

/* =========================
   MODAL
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
