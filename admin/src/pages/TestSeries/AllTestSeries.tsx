import React, { useEffect, useState, useCallback, useRef } from "react";
import axios, { isAxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import {
  Edit,
  Trash2,
  Eye,
  Search,
  UploadCloud,
  CheckCircle,
  PlusCircle,
  Loader2,
  Filter,
  X,
  FileText,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

interface TestSeries {
  id: number;
  imageUrl: string;
  title: string;
  slug: string;
  displayOrder: number;
  status: string;
  isActive: boolean;
  totalSubmissions:number
  totalPurchases:number
  description: string;
  questionPdf?: string;
  answerkey?: string;
  price: number;
  discountPrice: number;
  type: string;
}

const AllTestSeries = () => {
  const [testSeries, setTestSeries] = useState<TestSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Upload Modal State
  const [uploadModal, setUploadModal] = useState<{
    open: boolean;
    type: "question" | "answerkey";
    testSeriesId: number | null;
    currentUrl?: string;
    title?: string;
  }>({ open: false, type: "question", testSeriesId: null });

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter states
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [status, setStatus] = useState("all");
  const [isActive, setIsActive] = useState("all");
  const [sortBy, setSortBy] = useState("displayOrder");
  const [sortOrder, setSortOrder] = useState("ASC");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const navigate = useNavigate();

  const fetchTestSeries = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Authentication required. Please login.");
        navigate("/login");
        return;
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        sortBy,
        sortOrder,
      });

      if (search.trim()) params.append("search", search.trim());
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (status !== "all") params.append("status", status);
      if (isActive !== "all") params.append("isActive", isActive);

      const response = await axios.get(
        `${API_URL}/testseriess?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setTestSeries(response.data.data);
        setTotalPages(response.data.pagination.totalPages || 1);
      } else {
        toast.error("Failed to fetch data");
      }
    } catch (err) {
      if (isAxiosError(err)) {
        const errorMessage =
          err.response?.data?.message || "Something went wrong";
        toast.error(errorMessage);
        console.error("Fetch error:", err);
      } else {
        toast.error("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }, [
    page,
    search,
    minPrice,
    maxPrice,
    status,
    isActive,
    sortBy,
    sortOrder,
    navigate,
  ]);

  useEffect(() => {
    fetchTestSeries();
  }, [fetchTestSeries]);

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This test series will be permanently deleted!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingId(id);
      const token = localStorage.getItem("accessToken");

      await axios.delete(`${API_URL}/testseriess/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Test series deleted successfully");
      setTestSeries((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      if (isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Delete failed";
        toast.error(errorMessage);
      } else {
        toast.error("Failed to delete. Please try again.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openUploadModal = (
    type: "question" | "answerkey",
    item: TestSeries,
  ) => {
    setUploadModal({
      open: true,
      type,
      testSeriesId: item.id,
      currentUrl: type === "question" ? item.questionPdf : item.answerkey,
      title: item.title,
    });
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!validTypes.includes(file.type)) {
      toast.error("Please select a PDF or image file (JPG, PNG)");
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);
  };

  const confirmUpload = async () => {
    if (!selectedFile || !uploadModal.testSeriesId) return;

    const hasExistingFile = uploadModal.currentUrl;

    if (hasExistingFile) {
      const result = await Swal.fire({
        title: "Replace existing file?",
        text: "This will replace the current file. This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, replace it",
        cancelButtonText: "Cancel",
      });

      if (!result.isConfirmed) {
        return;
      }
    }

    const formData = new FormData();
    const fieldName =
      uploadModal.type === "question" ? "questionSheet" : "answerKey";
    formData.append(fieldName, selectedFile);

    uploadFile(formData);
  };

  const uploadFile = async (formData: FormData) => {
    if (!uploadModal.testSeriesId) return;

    const uploadToast = toast.loading("Uploading file...");

    try {
      setUploading(true);
      setUploadProgress(0);
      const token = localStorage.getItem("accessToken");

      const endpoint =
        uploadModal.type === "question"
          ? `/testseriess/${uploadModal.testSeriesId}/upload-question-sheet`
          : `/testseriess/${uploadModal.testSeriesId}/upload-answer-key`;

      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            setUploadProgress(progress);
          }
        },
      });

      if (response.data.success) {
        toast.success(
          uploadModal.type === "question"
            ? "Question sheet uploaded successfully!"
            : "Answer key uploaded successfully!",
          { id: uploadToast },
        );

        // Update local state
        setTestSeries((prev) =>
          prev.map((item) =>
            item.id === uploadModal.testSeriesId
              ? {
                  ...item,
                  questionPdf:
                    uploadModal.type === "question"
                      ? response.data.data.questionPdfUrl
                      : item.questionPdf,
                  answerkey:
                    uploadModal.type === "answerkey"
                      ? response.data.data.answerKeyUrl
                      : item.answerkey,
                }
              : item,
          ),
        );

        // Close modal
        setUploadModal({ open: false, type: "question", testSeriesId: null });
        setSelectedFile(null);
      } else {
        toast.error("Upload failed. Please try again.", { id: uploadToast });
      }
    } catch (err) {
      if (isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || "Upload failed";
        toast.error(errorMessage, { id: uploadToast });

        // Log detailed error for debugging
        console.error("Upload error:", {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
      } else {
        toast.error("Network error. Please check your connection.", {
          id: uploadToast,
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleViewPdf = () => {
    if (uploadModal.currentUrl) {
      window.open(uploadModal.currentUrl, "_blank");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setMinPrice("");
    setMaxPrice("");
    setStatus("all");
    setIsActive("all");
    setSortBy("displayOrder");
    setSortOrder("ASC");
    setPage(1);
  };

  const closeUploadModal = () => {
    if (uploading) {
      toast.error("Please wait for the upload to complete");
      return;
    }
    setUploadModal({ open: false, type: "question", testSeriesId: null });
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">All Test Series</h1>
          <button
            onClick={() => navigate("/admin/testseries/new")}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Add New Test Series
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search title..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="featured">Featured</option>
              <option value="popular">Popular</option>
              <option value="normal">Normal</option>
            </select>

            <select
              value={isActive}
              onChange={(e) => {
                setIsActive(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Active</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="displayOrder">Display Order</option>
              <option value="price">Price</option>
              <option value="createdAt">Created Date</option>
              <option value="title">Title</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setPage(1);
              }}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <p className="text-gray-600">Loading test series...</p>
          </div>
        ) : testSeries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              No test series found matching your filters.
            </p>
            <button
              onClick={resetFilters}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Image
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Title
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Price
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Total Purchased
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Answer Submits
                      </th>

                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-medium text-gray-700">
                        Files
                      </th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                        Active
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {testSeries.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-md shadow-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900">
                            {item.title}
                          </p>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2 max-w-md">
                            {item.description}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          {item.discountPrice < item.price ? (
                            <div>
                              <span className="text-lg font-bold text-green-600">
                                ₹{item.discountPrice}
                              </span>
                              <span className="text-sm text-gray-500 line-through ml-2">
                                ₹{item.price}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-bold">
                              ₹{item.price}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {item.totalPurchases || 0}
                        </td>
                        <td className="px-6 py-4">
                          {item?.totalSubmissions || 0}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              item.status === "featured"
                                ? "bg-purple-100 text-purple-800"
                                : item.status === "popular"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-4">
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                item.questionPdf
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span>Q</span>
                              {item.questionPdf ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <span>✖</span>
                              )}
                            </div>
                            <div
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                item.answerkey
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <span>A</span>
                              {item.answerkey ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <span>✖</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                              item.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() =>
                                navigate(`/testseries/${item.id}?slug=${item.slug}`)
                              }
                              className="text-blue-600 hover:text-blue-800 transition"
                              title="View Test Series"
                            >
                              <Eye className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() =>
                                navigate(`/admin/testseries/edit/${item.id}`)
                              }
                              className="text-green-600 hover:text-green-800 transition"
                              title="Edit Details"
                            >
                              <Edit className="w-5 h-5" />
                            </button>

                            <button
                              onClick={() => openUploadModal("question", item)}
                              className={`p-2 rounded-lg transition shadow-sm ${
                                item.questionPdf
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              }`}
                              title={
                                item.questionPdf
                                  ? "Update Question Sheet"
                                  : "Upload Question Sheet"
                              }
                            >
                              {item.questionPdf ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <UploadCloud className="w-5 h-5" />
                              )}
                            </button>

                            <button
                              onClick={() => openUploadModal("answerkey", item)}
                              className={`p-2 rounded-lg transition shadow-sm ${
                                item.answerkey
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              }`}
                              title={
                                item.answerkey
                                  ? "Update Answer Key"
                                  : "Upload Answer Key"
                              }
                            >
                              {item.answerkey ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <UploadCloud className="w-5 h-5" />
                              )}
                            </button>

                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 transition"
                              title="Delete Test Series"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-6 py-3 border rounded-lg disabled:opacity-50 hover:bg-gray-100 transition"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-gray-700 font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                  className="px-6 py-3 border rounded-lg disabled:opacity-50 hover:bg-gray-100 transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Upload Modal */}
      {uploadModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[99999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {uploadModal.type === "question"
                    ? "Question Sheet"
                    : "Answer Key"}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {uploadModal.title}
                </p>
              </div>
              <button
                onClick={closeUploadModal}
                disabled={uploading}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Current File Info */}
              {uploadModal.currentUrl && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">
                          Current file uploaded
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Uploading a new file will replace the existing one
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleViewPdf}
                      className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-medium transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : selectedFile
                      ? "border-green-500 bg-green-50"
                      : "border-gray-300 bg-gray-50"
                }`}
              >
                {selectedFile ? (
                  <div className="space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <div>
                      <p className="text-lg font-semibold text-gray-800">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <>
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      {dragActive ? "Drop file here" : "Drag & drop file here"}
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                      Supports PDF, JPG, PNG (Max 10MB)
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Choose File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleFileSelect(e.target.files[0])
                      }
                      className="hidden"
                      disabled={uploading}
                    />
                  </>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 font-medium">
                      Uploading...
                    </span>
                    <span className="text-blue-600 font-bold">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={closeUploadModal}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmUpload}
                  disabled={!selectedFile || uploading}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5" />
                      {uploadModal.currentUrl ? "Replace File" : "Upload File"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllTestSeries;
