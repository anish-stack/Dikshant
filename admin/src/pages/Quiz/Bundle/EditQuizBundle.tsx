import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2, Upload, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = "https://www.app.api.dikshantias.com//api";

const EditQuizBundle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [gst, setGst] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuizzes, setSelectedQuizzes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch bundle + all quizzes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        if (!token) {
          Swal.fire("Error", "Please login to continue", "error");
          navigate("/login");
          return;
        }

        // 1. Fetch all quizzes
        const quizzesRes = await axios.get(`${API_URL}/quiz/quizzes?is_admin=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (quizzesRes.data.success) {
          setQuizzes(quizzesRes.data.data || []);
        }

        // 2. Fetch current bundle
        const bundleRes = await axios.get(`${API_URL}/quiz-bundles/${id}?isAdmin=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (bundleRes.data.success) {
          const bundle = bundleRes.data.data;

          setTitle(bundle.title || "");
          setDescription(bundle.description || "");
          setPrice(bundle.price?.toString() || "");
          setDiscountPrice(bundle.discountPrice?.toString() || "");
          setGst(bundle.gst?.toString() || "");
          setDisplayOrder(bundle.displayOrder?.toString() || "0");
          setSelectedQuizzes(bundle.quizzes?.map((q: any) => q.id) || []);
          setExistingImageUrl(bundle.imageUrl || "");

          if (bundle.imageUrl) {
            setImagePreview(bundle.imageUrl);
          }

          // Auto-calculate discount percent if discount exists
          if (bundle.price && bundle.discountPrice && bundle.discountPrice < bundle.price) {
            const perc = ((bundle.price - bundle.discountPrice) / bundle.price) * 100;
            setDiscountPercent(perc.toFixed(1));
          }
        } else {
          Swal.fire("Error", "Bundle not found", "error");
          navigate("/all-quiz-bundles");
        }
      } catch (err) {
        console.error("Failed to load data:", err);
        Swal.fire("Error", "Could not load quiz bundle data", "error");
        navigate("/all-quiz-bundles");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Image change handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  // Discount calculator (same as create)
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
      Swal.fire("Warning", "Discount % must be between 0 and 100", "warning");
      setDiscountPercent("");
      setDiscountPrice("");
      return;
    }

    const discountAmt = orig * (perc / 100);
    const finalPrice = orig - discountAmt;
    setDiscountPrice(Math.round(finalPrice).toString());
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
        formData.append("image", imageFile);
      }

      const res = await axios.put(
        `${API_URL}/quiz-bundles/${id}?isAdmin=true`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "Quiz bundle updated successfully",
          timer: 1800,
        });
        navigate("/all-quiz-bundles");
      }
    } catch (error: any) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: error.response?.data?.message || "Could not update quiz bundle",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading quiz bundle data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
          <h2 className="text-2xl md:text-3xl font-bold">Edit Quiz Bundle</h2>
          <p className="mt-2 text-indigo-100">Update details and included quizzes</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">
          {/* Image */}
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
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(existingImageUrl || "");
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ) : null}

              <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 px-6 py-10 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center gap-3 transition w-full sm:w-64">
                <Upload className="w-10 h-10 text-gray-400" />
                <span className="text-gray-600 text-center text-sm">
                  {imageFile ? "New image selected" : "Replace image (optional)"}
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Savings */}
          {price && discountPrice && Number(discountPrice) < Number(price) && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl">
              Savings: ₹{Math.round(Number(price) - Number(discountPrice))} ({discountPercent}%)
            </div>
          )}

          {/* GST & Order */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">GST (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
              <input
                type="number"
                min="0"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
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
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
            />
          </div>

          {/* Quiz Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Included Quizzes <span className="text-red-600">*</span>
              </label>
              <span className="text-sm text-gray-600">
                {selectedQuizzes.length} selected
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto border rounded-xl bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {quizzes.map((quiz) => (
                <label
                  key={quiz.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                    selectedQuizzes.includes(quiz.id)
                      ? "bg-indigo-50 border-indigo-300"
                      : "bg-white border-gray-200 hover:bg-indigo-50/40"
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
                    className="mt-1 h-5 w-5 text-indigo-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{quiz.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {quiz.totalQuestions || 0} Qs • {quiz.durationMinutes || 0} min
                      {quiz.price && ` • ₹${quiz.price}`}
                      {quiz.isFree && <span className="text-green-600 ml-2">Free</span>}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              {saving ? "Saving..." : "Update Quiz Bundle"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/all-quiz-bundles")}
              className="flex-1 px-6 py-3.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditQuizBundle;