import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://www.app.api.dikshantias.com/api";

interface Quiz {
  id: number;
  image: string | null;
  title: string;
  description: string;
  totalQuestions: number;
  durationMinutes: number;
  totalPurchases: number;
  totalMarks: number;
  passingMarks: number;
  isFree: boolean;
  price: number | null;
  status: "draft" | "published";
  createdAt: string;
}

const CreateQuizBundle = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [gst, setGst] = useState("");
  const [displayOrder, setDisplayOrder] = useState("1");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<number[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch quizzes
  const fetchQuizzes = async (page = 1, search = "") => {
    try {
      setLoadingQuizzes(true);
      const token = localStorage.getItem("accessToken");

      const params = new URLSearchParams({
        page: String(page),
        is_admin: "true",
        limit: "20", // more items for selection
        ...(search ? { search } : {}),
      });

      const res = await axios.get(`${API_URL}/quiz/quizzes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setQuizzes(res.data.data || []);
      }
    } catch (err) {
      Swal.fire("Error", "Failed to load quizzes", "error");
    } finally {
      setLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Remove image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  // Discount logic (same as before)
  const calculateFromDiscountPrice = (discPriceStr: string) => {
    const disc = Number(discPriceStr);
    const orig = Number(price);

    if (!orig || orig <= 0) return;

    if (isNaN(disc) || disc < 0) {
      setDiscountPercent("");
      return;
    }

    if (disc >= orig) {
      Swal.fire("Warning", "Discount price cannot be ≥ original price", "warning");
      setDiscountPrice("");
      setDiscountPercent("");
      return;
    }

    const perc = ((orig - disc) / orig) * 100;
    setDiscountPercent(perc.toFixed(1));
  };

  const calculateFromDiscountPercent = (percStr: string) => {
    const perc = Number(percStr);
    const orig = Number(price);

    if (!orig || orig <= 0) return;

    if (isNaN(perc) || perc < 0 || perc > 100) {
      Swal.fire("Warning", "Discount % must be 0–100", "warning");
      setDiscountPercent("");
      setDiscountPrice("");
      return;
    }

    const discountAmt = orig * (perc / 100);
    const final = orig - discountAmt;
    setDiscountPrice(Math.round(final).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return Swal.fire("Error", "Title is required", "error");
    if (selectedQuizzes.length === 0) return Swal.fire("Error", "Select at least one quiz", "error");
    if (!price || Number(price) <= 0) return Swal.fire("Error", "Original price must be > 0", "error");

    try {
      setSaving(true);
      const token = localStorage.getItem("accessToken");

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("price", price);
      if (discountPrice) formData.append("discountPrice", discountPrice);
      if (gst) formData.append("gst", gst);
      formData.append("displayOrder", displayOrder || "0");
      formData.append("quizIds", JSON.stringify(selectedQuizzes));

      if (imageFile) {
        formData.append("image", imageFile); // backend expects "image" field
      }

      const res = await axios.post(`${API_URL}/quiz-bundles?isAdmin=true`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Created!",
          text: "Quiz bundle created successfully",
          timer: 1800,
        });
        navigate("/all-quiz-bundles"); // or wherever your list page is
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: error.response?.data?.message || "Could not create quiz bundle",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-6 text-white">
          <h2 className="text-2xl md:text-3xl font-bold">Create Quiz Bundle</h2>
          <p className="mt-2 text-purple-100">Group multiple quizzes into one bundle</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Cover Image</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-xl shadow border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : null}

              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 px-6 py-10 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center gap-3 transition w-full sm:w-64">
                <Upload className="w-10 h-10 text-gray-400" />
                <span className="text-gray-600 text-center text-sm">
                  {imageFile ? "Image selected" : "Upload cover image"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bundle Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g. SSC CGL Complete Quiz Bundle 2026"
              required
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Original Price (₹) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (discountPercent) calculateFromDiscountPercent(discountPercent);
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="1499"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Price (₹)</label>
              <input
                type="number"
                min="0"
                value={discountPrice}
                onChange={(e) => {
                  setDiscountPrice(e.target.value);
                  calculateFromDiscountPrice(e.target.value);
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(e.target.value);
                  calculateFromDiscountPercent(e.target.value);
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="33"
              />
            </div>
          </div>

          {/* Savings Preview */}
          {price && discountPrice && Number(discountPrice) < Number(price) && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl">
              You save ₹{Math.round(Number(price) - Number(discountPrice))} ({discountPercent}%)
            </div>
          )}

          {/* GST & Display Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="18"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
              <input
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Higher = shows first"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-y"
              placeholder="What this bundle offers, validity, target exams, benefits..."
            />
          </div>

          {/* Quiz Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Quizzes <span className="text-red-600">*</span>
              </label>
              <span className="text-sm text-gray-600">
                {selectedQuizzes.length} selected
              </span>
            </div>

            {loadingQuizzes ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : quizzes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No quizzes found</p>
            ) : (
              <div className="max-h-80 overflow-y-auto border rounded-xl bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {quizzes.map((quiz) => (
                  <label
                    key={quiz.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                      selectedQuizzes.includes(quiz.id)
                        ? "bg-purple-50 border-purple-300"
                        : "bg-white border-gray-200 hover:bg-purple-50/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuizzes.includes(quiz.id)}
                      onChange={() =>
                        setSelectedQuizzes((prev) =>
                          prev.includes(quiz.id)
                            ? prev.filter((i) => i !== quiz.id)
                            : [...prev, quiz.id]
                        )
                      }
                      className="mt-1 h-5 w-5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{quiz.title}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {quiz.totalQuestions} Qs • {quiz.durationMinutes} min
                        {quiz.price && ` • ₹${quiz.price}`}
                        {quiz.isFree && <span className="text-green-600 ml-2">Free</span>}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {saving && <Loader2 className="w-5 h-5 animate-spin" />}
            {saving ? "Creating..." : "Create Quiz Bundle"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateQuizBundle;