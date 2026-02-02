import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Upload } from "lucide-react";
import { API_URL } from "../../constant/constant";

const EditTestSeries = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    discountPrice: "",
    status: "normal",
    isActive: true,
    displayOrder: "",
    type: "subjective",
    timeDurationForTest: "",
    passing_marks: "",
    testStartDate: "",
    testStartTime: "",
    AnswerSubmitDateAndTime: "",
    AnswerLastSubmitDateAndTime: "",
    expirSeries: "",
  });

  useEffect(() => {
    const fetchTestSeries = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(`${API_URL}/testseriess/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data) {
          const data = response.data.data || response.data;
          setFormData({
            title: data.title || "",
            description: data.description || "",
            price: data.price?.toString() || "",
            discountPrice: data.discountPrice?.toString() || "",
            status: data.status || "normal",
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder?.toString() || "",
            type: data.type || "subjective",
            timeDurationForTest: data.timeDurationForTest?.toString() || "",
            passing_marks: data.passing_marks?.toString() || "",
            testStartDate: data.testStartDate ? data.testStartDate.split("T")[0] : "",
            testStartTime: data.testStartTime ? data.testStartTime.slice(0, 16) : "",
            AnswerSubmitDateAndTime: data.AnswerSubmitDateAndTime ? data.AnswerSubmitDateAndTime.slice(0, 16) : "",
            AnswerLastSubmitDateAndTime: data.AnswerLastSubmitDateAndTime ? data.AnswerLastSubmitDateAndTime.slice(0, 16) : "",
            expirSeries: data.expirSeries ? data.expirSeries.split("T")[0] : "",
          });
          setImagePreview(data.imageUrl || "");
        }
      } catch (err) {
        toast.error("Failed to load test series");
        navigate("all-test-series");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTestSeries();
  }, [id, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("accessToken");
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });

      if (imageFile) {
        data.append("imageUrl", imageFile);
      }

      const response = await axios.put(`${API_URL}/testseriess/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Test series updated successfully!");
        navigate("all-test-series");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg text-gray-600">Loading test series...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-right" />
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Edit Test Series</h1>
          <button
            onClick={() => navigate("all-test-series")}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to List
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
          {/* Cover Image */}
          <div>
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              Cover Image
            </label>
            <div className="flex items-center gap-8">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Cover preview"
                  className="w-48 h-48 object-cover rounded-xl shadow-md"
                />
              )}
              <label className="cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-dashed border-blue-300 px-8 py-10 rounded-xl flex flex-col items-center gap-4 transition">
                <Upload className="w-12 h-12 text-blue-600" />
                <div className="text-center">
                  <p className="font-medium text-gray-700">Click to upload new image</p>
                  <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="border-t pt-8" />

          {/* Basic Information */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
                  placeholder="e.g. 1, 2, 3..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Regular Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Price (₹)
                </label>
                <input
                  type="number"
                  value={formData.discountPrice}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value })}
                  placeholder="Leave blank if no discount"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="featured">Featured</option>
                  <option value="popular">Popular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="subjective">Subjective</option>
                  <option value="objective">Objective</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the test series, syllabus coverage, features, etc."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="border-t pt-8" />

          {/* Test Schedule & Details */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Test Schedule & Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Start Date
                </label>
                <input
                  type="date"
                  value={formData.testStartDate}
                  onChange={(e) => setFormData({ ...formData, testStartDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.testStartTime}
                  onChange={(e) => setFormData({ ...formData, testStartTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Submission Starts
                </label>
                <input
                  type="datetime-local"
                  value={formData.AnswerSubmitDateAndTime}
                  onChange={(e) => setFormData({ ...formData, AnswerSubmitDateAndTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Submission Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.AnswerLastSubmitDateAndTime}
                  onChange={(e) => setFormData({ ...formData, AnswerLastSubmitDateAndTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Series Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.expirSeries}
                  onChange={(e) => setFormData({ ...formData, expirSeries: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Duration (minutes)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 120"
                  value={formData.timeDurationForTest}
                  onChange={(e) => setFormData({ ...formData, timeDurationForTest: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passing Marks
                </label>
                <input
                  type="number"
                  value={formData.passing_marks}
                  onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-8" />

          {/* Status */}
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-lg font-medium text-gray-800">
              Publish this test series (Make it visible to students)
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-8">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white px-10 py-4 rounded-lg font-semibold text-lg flex items-center gap-3 transition shadow-lg"
            >
              {saving && <Loader2 className="w-6 h-6 animate-spin" />}
              {saving ? "Saving..." : "Update Test Series"}
            </button>
            <button
              type="button"
              onClick={() => navigate("all-test-series")}
              className="px-10 py-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTestSeries;