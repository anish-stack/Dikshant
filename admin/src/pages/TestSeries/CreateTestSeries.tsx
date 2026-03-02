import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Loader2, Upload } from "lucide-react";
import { API_URL } from "../../constant/constant";
import Swal from "sweetalert2";

const CreateTestSeries = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedSlug, setGeneratedSlug] = useState<string>("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    discountPrice: "",
    status: "new",           // Changed default to match backend common value
    isActive: true,
    displayOrder: "1",
    type: "subjective",       // Most common default
    timeDurationForTest: "",
    passing_marks: "",
    testStartDate: "",
    testStartTime: "",
    AnswerSubmitDateAndTime: "",
    AnswerLastSubmitDateAndTime: "",
    expirSeries: "",
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (formData.title.trim()) {
      const slug = formData.title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
      setGeneratedSlug(slug);
    } else {
      setGeneratedSlug("");
    }
  }, [formData.title]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imageFile) {
      Swal.fire({
        icon: "warning",
        title: "Image Required",
        text: "Please upload a cover image for the test series",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    if (!formData.title.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Title Required",
        text: "Please enter a title for the test series",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        Swal.fire({
          icon: "error",
          title: "Authentication Required",
          text: "Please login to continue",
          confirmButtonColor: "#3b82f6",
        });
        navigate("/login");
        return;
      }

      const data = new FormData();

      // Append form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          data.append(key, String(value));
        }
      });

      // Append auto-generated slug
      if (generatedSlug) {
        data.append("slug", generatedSlug);
      }

      data.append("imageUrl", imageFile); // backend expects "imageUrl" for multer/file field

      const response = await axios.post(`${API_URL}/testseriess`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Test series has been created successfully",
          confirmButtonColor: "#10b981",
          timer: 2000,
        }).then(() => {
          navigate("/all-test-series");
        });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to create test series. Please check your inputs and try again.";

      Swal.fire({
        icon: "error",
        title: "Error",
        html: `<div style="text-align:left;">${errorMsg}</div>`,
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Create New Test Series</h1>
          <p className="text-gray-600 mb-8">Fill in the details below to add a new test series</p>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cover Image <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-40 h-40 object-cover rounded-lg shadow border border-gray-200"
                    />
                  </div>
                )}
                <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 px-6 py-10 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center gap-3 transition w-full sm:w-64">
                  <Upload className="w-10 h-10 text-gray-400" />
                  <span className="text-gray-600 text-center text-sm">
                    {imageFile ? "Image selected" : "Click or drag image here"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    required
                  />
                </label>
              </div>
              {!imageFile && (
                <p className="mt-2 text-sm text-red-600">Required field</p>
              )}
            </div>

            {/* Title + Slug */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. UPSC Prelims Mock Test 2026"
                  required
                  title="This will be the main display name of the test series"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auto-generated Slug
                </label>
                <input
                  type="text"
                  value={generatedSlug}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 cursor-not-allowed"
                  placeholder="auto-generated-from-title"
                  title="Used in URLs – automatically created from title"
                />
              </div>
            </div>

            {/* Status & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  title="Controls visibility & highlighting on frontend"
                >
                  <option value="new">New</option>
                  <option value="active">Active</option>
                  <option value="featured">Featured</option>
                  <option value="popular">Popular</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="objective">Objective (MCQ)</option>
                  <option value="subjective">Subjective</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </div>

            {/* Price & Order */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 999"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 599 (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="1 = highest priority"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Detailed information about the test series, syllabus coverage, benefits, etc."
                required
              />
            </div>

            {/* Dates & Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Start Date
                </label>
                <input
                  type="date"
                  value={formData.testStartDate}
                  onChange={(e) => setFormData({ ...formData, testStartDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Start Time
                </label>
                <input
                  type="time"
                  value={formData.testStartTime}
                  onChange={(e) => setFormData({ ...formData, testStartTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.timeDurationForTest}
                  onChange={(e) => setFormData({ ...formData, timeDurationForTest: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 120"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer Submission Start
                </label>
                <input
                  type="datetime-local"
                  value={formData.AnswerSubmitDateAndTime}
                  onChange={(e) => setFormData({ ...formData, AnswerSubmitDateAndTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Submission Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.AnswerLastSubmitDateAndTime}
                  onChange={(e) => setFormData({ ...formData, AnswerLastSubmitDateAndTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Series Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expirSeries}
                  onChange={(e) => setFormData({ ...formData, expirSeries: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Passing Marks & Active */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Marks
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.passing_marks}
                  onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. 40"
                />
              </div>

              <div className="flex items-center gap-3 pt-8">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="text-gray-700 font-medium">
                  Publish Immediately (Active)
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 shadow-sm"
              >
                {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                Create Test Series
              </button>

              <button
                type="button"
                onClick={() => navigate("/all-test-series")}
                className="flex-1 px-8 py-3.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTestSeries;