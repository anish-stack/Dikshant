import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Upload } from "lucide-react";
import { API_URL } from "../../constant/constant";

const CreateTestSeries = () => {
  const navigate = useNavigate();
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
    displayOrder: "1",
    type: "subjective",
    timeDurationForTest: "",
    passing_marks: "",
    testStartDate: "",
    testStartTime: "",
    AnswerSubmitDateAndTime: "",
    AnswerLastSubmitDateAndTime: "",
    expirSeries: "",
  });

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
      toast.error("Please upload an image");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        toast.error("Authentication required");
        navigate("/login");
        return;
      }

      const data = new FormData();

      // Append all form fields
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value.toString());
      });

      data.append("imageUrl", imageFile);

      const response = await axios.post(`${API_URL}/testseriess`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        toast.success("Test series created successfully!");
        navigate("/all-test-series");
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to create test series",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Create New Test Series
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm p-8 space-y-6"
        >
          {/* Image Upload - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-6">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-40 h-40 object-cover rounded-lg shadow-md"
                />
              )}
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-6 py-8 rounded-lg border-2 border-dashed flex flex-col items-center gap-3 transition w-48">
                <Upload className="w-10 h-10 text-gray-500" />
                <span className="text-gray-700 text-center">
                  {imageFile ? "Uploaded" : "Click to upload image"}
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
              <p className="text-sm text-red-600 mt-2">Image is required</p>
            )}
          </div>

          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData({ ...formData, displayOrder: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Price (₹)
              </label>
              <input
                type="number"
                value={formData.discountPrice}
                onChange={(e) =>
                  setFormData({ ...formData, discountPrice: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="Leave blank if no discount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="normal">Normal</option>
                <option value="featured">Featured</option>
                <option value="popular">Popular</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="subjective">Subjective</option>
                <option value="objective">Objective</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Start Date
              </label>
              <input
                type="date"
                value={formData.testStartDate}
                onChange={(e) =>
                  setFormData({ ...formData, testStartDate: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Start Time
              </label>
              <input
                type="datetime-local"
                value={formData.testStartTime}
                onChange={(e) =>
                  setFormData({ ...formData, testStartTime: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Answer Submission Start
              </label>
              <input
                type="datetime-local"
                value={formData.AnswerSubmitDateAndTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    AnswerSubmitDateAndTime: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Submission Time
              </label>
              <input
                type="datetime-local"
                value={formData.AnswerLastSubmitDateAndTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    AnswerLastSubmitDateAndTime: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series Expiry Date
              </label>
              <input
                type="date"
                value={formData.expirSeries}
                onChange={(e) =>
                  setFormData({ ...formData, expirSeries: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.timeDurationForTest}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    timeDurationForTest: e.target.value,
                  })
                }
                className="w-full px-4 py-3 border rounded-lg"
                placeholder="e.g. 120"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passing Marks
              </label>
              <input
                type="number"
                value={formData.passing_marks}
                onChange={(e) =>
                  setFormData({ ...formData, passing_marks: e.target.value })
                }
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData({ ...formData, isActive: e.target.checked })
              }
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="isActive" className="text-gray-700 font-medium">
              Publish (Active)
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-8">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-70 flex items-center gap-3 transition"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              Create Test Series
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/testseries")}
              className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTestSeries;
