import React, { useEffect, useState } from "react";
import axios, { isAxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Edit,
  Trash2,
  Eye,
  Search,
  PlusCircle,
  Clock,
  Trophy,
  IndianRupee,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

interface Quiz {
  id: number;
  image: string | null;
  title: string;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isFree: boolean;
  price: number | null;
  status: "draft" | "published";
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  is_admin: boolean;
  limit: number;
  totalPages: number;
}

const AllQuizzesPage: React.FC = () => {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchQuizzes = async (page: number = 1, search: string = "") => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        is_admin: true,
        limit: "10",
        ...(search && { search }),
      });

      const res = await axios.get(
        `${API_URL}/quiz/quizzes?${params.toString()}`,
      );
      const { data, pagination: pag } = res.data;

      setQuizzes(data || []);
      setPagination(pag || { total: 0, page: 1, limit: 10, totalPages: 1 });
      setCurrentPage(page);
    } catch (err) {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes(currentPage, searchTerm);
  }, [currentPage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchQuizzes(1, searchTerm.trim());
  };

  const handleDelete = async (id: number, title: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${title}"?\nThis action cannot be undone.`,
      )
    )
      return;

    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API_URL}/quiz/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Quiz deleted successfully");
      fetchQuizzes(currentPage, searchTerm);
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message || "Failed to delete"
        : "Network error";
      toast.error(msg);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Manage Quizzes
              </h1>
              <p className="text-gray-600 mt-1">
                Create, edit, and manage all your quizzes
              </p>
            </div>
            <Link
              to="/create-quizzes"
              className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold transition shadow-md"
            >
              <PlusCircle className="w-5 h-5" />
              Create New Quiz
            </Link>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="relative max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quiz List */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {loading ? (
              <div className="divide-y divide-gray-200">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-6 flex items-center gap-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-gray-200 rounded w-64 animate-pulse" />
                      <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
                      <div className="flex gap-4">
                        <div className="h-8 bg-gray-200 rounded-full w-24 animate-pulse" />
                        <div className="h-8 bg-gray-200 rounded-full w-20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : quizzes.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <Search className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No quizzes found
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? "Try adjusting your search"
                    : "Start by creating your first quiz!"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="p-6 hover:bg-gray-50 transition flex items-center gap-6"
                  >
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {quiz.image ? (
                        <img
                          src={quiz.image}
                          alt={quiz.title}
                          className="w-24 h-24 object-cover rounded-xl shadow-md border border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-blue-600 border border-gray-200">
                          {quiz.title[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {quiz.title}
                      </h3>

                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1
                 text-sm font-semibold text-indigo-800">
                        🛒 Total Purchased: {quiz.totalPurchases}
                      </span>

                      <p className="text-gray-600 line-clamp-2 mb-4">
                        {quiz.description || "No description available"}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {quiz.durationMinutes} min
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">
                            {quiz.totalMarks} marks • Pass: {quiz.passingMarks}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {quiz.isFree ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-green-700 font-semibold">
                                Free
                              </span>
                            </>
                          ) : (
                            <>
                              <IndianRupee className="w-4 h-4 text-orange-600" />
                              <span className="text-orange-700 font-bold">
                                ₹{quiz.price}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${quiz.status === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {quiz.status === "published"
                              ? "Published"
                              : "Draft"}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mt-3">
                        Created on {formatDate(quiz.createdAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      
                            <button
                        onClick={() =>
                          navigate(`/all-attemps?id=${quiz.id}`)
                        }
                        className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition shadow-sm"
                        title="All Attempt"
                      >
                        Attempts
                      </button>



                      <button
                        onClick={() =>
                          navigate(`/create-quizzes?id=${quiz.id}`)
                        }
                        className="p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition shadow-sm"
                        title="View / Edit Quiz"
                      >
                        <Eye className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => navigate(`/create-questions/${quiz.id}`)}
                        className="p-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-xl transition shadow-sm"
                        title="Add / Manage Questions"
                      >
                        <PlusCircle className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleDelete(quiz.id, quiz.title)}
                        className="p-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl transition shadow-sm"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-gray-200 px-6 py-5 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
                  {Math.min(currentPage * pagination.limit, pagination.total)}{" "}
                  of {pagination.total} quizzes
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Previous
                  </button>

                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-4 py-2 rounded-lg transition ${currentPage === i + 1
                          ? "bg-blue-600 text-white"
                          : "border border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      setCurrentPage(
                        Math.min(pagination.totalPages, currentPage + 1),
                      )
                    }
                    disabled={currentPage === pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllQuizzesPage;
