import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  Download,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  FileText,
  Search,
  Filter,
  X,
  Calendar,
  ExternalLink,
  Users,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

interface UserInfo {
  id: number;
  name: string;
  email: string;
  mobile: string;
}

interface TestSeriesInfo {
  id: number;
  title: string;
  slug: string;
  AnswerSubmitDateAndTime: string;
  AnswerLastSubmitDateAndTime: string;
}

interface Submission {
  id: number;
  testSeriesId: number;
  userId: number;
  answerSheetUrls: string; // JSON string of array
  submittedAt: string;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
  User: UserInfo;
  TestSery: TestSeriesInfo;
}

interface ApiResponse {
  success: boolean;
  testSeries: TestSeriesInfo;
  data: Submission[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const ViewSubmission = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ontime" | "late">(
    "all",
  );
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (id) fetchSubmissions();
  }, [id]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      if (!token) {
        toast.error("Please login to continue");
        navigate("/login");
        return;
      }

      const res = await axios.get(`${API_URL}/testseriess/submissions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setResponse(res.data);
      } else {
        toast.error("Failed to load submissions");
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Error loading submissions";
      toast.error(errorMessage);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (
    url: string,
    filename: string,
    submissionId: number,
  ) => {
    try {
      setDownloadingId(submissionId);

      // Open in new tab
      window.open(url, "_blank");

      // Also trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Download started!");
    } catch (error) {
      toast.error("Failed to download file");
      console.error("Download error:", error);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  const parseUrls = (urlsString: string): string[] => {
    try {
      return JSON.parse(urlsString);
    } catch {
      return [];
    }
  };

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const getFilteredSubmissions = () => {
    if (!response) return [];

    let filtered = response.data;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.User.name.toLowerCase().includes(query) ||
          sub.User.email.toLowerCase().includes(query) ||
          sub.User.mobile.includes(query),
      );
    }

    // Status filter
    if (filterStatus === "ontime") {
      filtered = filtered.filter((sub) => !sub.isLate);
    } else if (filterStatus === "late") {
      filtered = filtered.filter((sub) => sub.isLate);
    }

    return filtered;
  };

  const exportToCSV = () => {
    if (!response) return;

    const headers = [
      "Name",
      "Email",
      "Mobile",
      "Submitted At",
      "Status",
      "Answer Sheets",
    ];
    const rows = response.data.map((sub) => {
      const urls = parseUrls(sub.answerSheetUrls);
      return [
        sub.User.name,
        sub.User.email,
        sub.User.mobile,
        formatDateTime(sub.submittedAt),
        sub.isLate ? "Late" : "On Time",
        urls.join(" | "),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${response.testSeries.title}_submissions.csv`;
    link.click();
    window.URL.revokeObjectURL(url);

    toast.success("CSV exported successfully!");
  };

  const isSubmissionWindowOpen = () => {
    if (!response) return false;
    const now = new Date().getTime();
    const start = new Date(
      response.testSeries.AnswerSubmitDateAndTime,
    ).getTime();
    const end = new Date(
      response.testSeries.AnswerLastSubmitDateAndTime,
    ).getTime();
    return now >= start && now < end;
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading submissions...</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              Error Loading Data
            </h2>
            <p className="text-lg text-gray-600">
              Unable to fetch submission data
            </p>
            <button
              onClick={fetchSubmissions}
              className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredSubmissions = getFilteredSubmissions();
  const onTimeCount = response.data.filter((s) => !s.isLate).length;
  const lateCount = response.data.filter((s) => s.isLate).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Test Series</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Submissions
              </h1>
              <p className="text-xl text-blue-600 font-semibold">
                {response.testSeries.title}
              </p>
            </div>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-sm"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Submissions</p>
                <p className="text-3xl font-bold text-gray-900">
                  {response.pagination.total}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">On Time</p>
                <p className="text-3xl font-bold text-green-600">
                  {onTimeCount}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Late Submissions</p>
                <p className="text-3xl font-bold text-red-600">{lateCount}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-red-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Window Status</p>
                <p className="text-lg font-bold text-purple-600">
                  {isSubmissionWindowOpen() ? "Open" : "Closed"}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Submission Window Info */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 mb-8 border border-blue-200">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-blue-600 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-3">
                Submission Window
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Opens At</p>
                  <p className="text-base font-semibold text-gray-900">
                    {formatDateTime(
                      response.testSeries.AnswerSubmitDateAndTime,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Closes At</p>
                  <p className="text-base font-semibold text-red-600">
                    {formatDateTime(
                      response.testSeries.AnswerLastSubmitDateAndTime,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  filterStatus === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({response.data.length})
              </button>
              <button
                onClick={() => setFilterStatus("ontime")}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  filterStatus === "ontime"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                On Time ({onTimeCount})
              </button>
              <button
                onClick={() => setFilterStatus("late")}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  filterStatus === "late"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Late ({lateCount})
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {filteredSubmissions.length !== response.data.length && (
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredSubmissions.length} of {response.data.length}{" "}
              submissions
            </p>
          </div>
        )}

        {/* Submissions Table */}
        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              No submissions found
            </h3>
            <p className="text-gray-600">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your filters"
                : "No students have submitted their answer sheets yet"}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-white">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-blue-600" />
                Student Submissions ({filteredSubmissions.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      #
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Student Details
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                      Submitted At
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">
                      Answer Sheets
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubmissions.map((submission, index) => {
                    const urls = parseUrls(submission.answerSheetUrls);
                    return (
                      <tr
                        key={submission.id}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="px-6 py-5">
                          <span className="text-gray-500 font-medium">
                            {index + 1}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-lg">
                                {submission.User.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-base">
                                {submission.User.name}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <span>📧</span>
                                {submission.User.email}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span>📱</span>
                                {submission.User.mobile}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="font-medium">
                                {formatDateTime(submission.submittedAt)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              ID: {submission.id}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-center">
                          {submission.isLate ? (
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full text-sm font-semibold shadow-sm">
                              <AlertCircle className="w-4 h-4" />
                              Late Submission
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold shadow-sm">
                              <CheckCircle className="w-4 h-4" />
                              On Time
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-center gap-2 flex-wrap">
                            {urls.map((url, idx) => (
                              <button
                                key={idx}
                                onClick={() =>
                                  downloadFile(
                                    url,
                                    `${submission.User.name}_Sheet_${idx + 1}.pdf`,
                                    submission.id,
                                  )
                                }
                                disabled={downloadingId === submission.id}
                                className="group relative p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-md hover:shadow-lg disabled:opacity-50"
                                title={`Download Answer Sheet ${idx + 1}`}
                              >
                                {downloadingId === submission.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <Download className="w-5 h-5" />
                                )}
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                  Sheet {idx + 1}
                                </span>
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() =>
                              (window.location.href = `/admin/testseries/result/${submission.id}`)
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 
             text-sm font-semibold text-white shadow-sm 
             hover:bg-indigo-700 active:scale-95 transition"
                          >
                            Add Result
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Info */}
            {response.pagination.totalPages > 1 && (
              <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Page {response.pagination.page} of{" "}
                  {response.pagination.totalPages}
                </p>
                <p className="text-sm text-gray-600">
                  Total: {response.pagination.total} submissions
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSubmission;
