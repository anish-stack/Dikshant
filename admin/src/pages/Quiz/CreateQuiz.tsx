import React, { useEffect, useState, useMemo } from "react";
import axios, { isAxiosError } from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Loader2, Upload, Info } from "lucide-react";
import { API_URL } from "../../constant/constant";

type Mode = "create" | "edit";

interface FormData {
  title: string;
  description: string;
  totalQuestions: string;
  time_per_question: string;
  durationMinutes: string;
  total_marks: string;
  passing_marks: string;
  negative_marking: boolean;
  negative_marks_per_question: string;
  is_free: boolean;
  price: string;
  attempt_limit: string;
  status: "draft" | "published";
  show_hints: boolean;
  show_explanations: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
}

const CreateQuiz: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("create");
  const [quizId, setQuizId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    totalQuestions: "",
    time_per_question: "",
    durationMinutes: "",
    total_marks: "",
    passing_marks: "",
    negative_marking: false,
    negative_marks_per_question: "",
    is_free: true,
    price: "",
    attempt_limit: "1",
    status: "draft",
    show_hints: false,
    show_explanations: true,
    shuffle_questions: true,
    shuffle_options: true,
  });

  const calculatedDuration = useMemo(() => {
    const questions = parseInt(form.totalQuestions) || 0;
    const timePerQ = parseInt(form.time_per_question) || 0;
    return questions > 0 && timePerQ > 0 ? Math.round((questions * timePerQ) / 60) : 0;
  }, [form.totalQuestions, form.time_per_question]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, durationMinutes: String(calculatedDuration) }));
  }, [calculatedDuration]);

  /* Detect Mode & Fetch */
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setMode("edit");
      setQuizId(id);
      fetchQuiz(id);
    } else {
      setMode("create");
    }
  }, [searchParams]);

  const fetchQuiz = async (id: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${API_URL}/quiz/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const q = res.data?.data;
      if (!q) {
        toast.error("Quiz not found");
        return;
      }

      setForm({
        title: q.title || "",
        description: q.description || "",
        totalQuestions: String(q.totalQuestions || ""),
        time_per_question: String(q.timePerQuestion || ""),
        durationMinutes: String(q.durationMinutes || ""),
        total_marks: String(q.totalMarks || ""),
        passing_marks: String(q.passingMarks || ""),
        negative_marking: q.negativeMarking || false,
        negative_marks_per_question: String(q.negativeMarksPerQuestion || ""),
        is_free: q.isFree ?? true,
        price: String(q.price || ""),
        attempt_limit: String(q.attemptLimit || "1"),
        status: q.status || "draft",
        show_hints: q.showHints || false,
        show_explanations: q.showExplanations || true,
        shuffle_questions: q.shuffleQuestions || true,
        shuffle_options: q.shuffleOptions || true,
      });

      if (q.image) setImagePreview(q.image);
    } catch (err) {
      toast.error("Failed to load quiz");
      navigate("/all-quizzes");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error("Quiz title is required");
      return;
    }

    if (parseInt(form.totalQuestions) <= 0) {
      toast.error("Total questions must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();

      // Append all fields
      (Object.keys(form) as (keyof FormData)[]).forEach((key) => {
        const value = form[key];
        if (typeof value === "boolean") {
          formData.append(key, value ? "true" : "false");
        } else {
          formData.append(key, value);
        }
      });

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url =
        mode === "create"
          ? `${API_URL}/quiz/quizzes`
          : `${API_URL}/quiz/quizzes/${quizId}`;

      const method = mode === "create" ? "post" : "put";

      await axios({
        method,
        url,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(`Quiz ${mode === "create" ? "created" : "updated"} successfully!`);
      setTimeout(() => navigate("/all-quizzes"), 1500);
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message || "Operation failed"
        : "Network error";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-t-2xl shadow-md p-8 border-b">
            <h1 className="text-3xl font-bold text-gray-800">
              {mode === "create" ? "Create New Quiz" : "Edit Quiz"}
            </h1>
            <p className="text-gray-600 mt-2">
              Configure quiz settings, timing, marking scheme, and visibility
            </p>
          </div>

          <div className="bg-white rounded-b-2xl shadow-lg p-8 space-y-10">
            {/* Quiz Cover Image */}
            <div className="text-center">
              <label className="block text-lg font-semibold text-gray-800 mb-4">
                Quiz Cover Image
              </label>
              <div className="inline-block">
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Quiz cover"
                      className="w-80 h-80 object-cover rounded-2xl shadow-xl border-4 border-gray-100"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <p className="text-white font-medium">Click below to change</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-80 h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center">
                    <Upload className="w-20 h-20 text-gray-400" />
                  </div>
                )}
              </div>

              <div className="mt-6">
                <label className="cursor-pointer inline-flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-md">
                  <Upload className="w-5 h-5" />
                  {imagePreview ? "Change Image" : "Upload Image"}
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

            {/* Basic Info */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Bank PO Prelims 2026"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.totalQuestions}
                    onChange={(e) => setForm({ ...form, totalQuestions: e.target.value })}
                    placeholder="e.g. 100"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time per Question (seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={form.time_per_question}
                    onChange={(e) => setForm({ ...form, time_per_question: e.target.value })}
                    placeholder="e.g. 60"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Duration (minutes)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={calculatedDuration || "-"}
                      disabled
                      className="w-full px-5 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700 font-semibold"
                    />
                    <Info className="absolute right-3 top-3.5 w-5 h-5 text-blue-500" title="Auto-calculated from questions × time per question" />
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Scoring & Attempts</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    value={form.total_marks}
                    onChange={(e) => setForm({ ...form, total_marks: e.target.value })}
                    placeholder="e.g. 200"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    value={form.passing_marks}
                    onChange={(e) => setForm({ ...form, passing_marks: e.target.value })}
                    placeholder="e.g. 120"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attempt Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.attempt_limit}
                    onChange={(e) => setForm({ ...form, attempt_limit: e.target.value })}
                    placeholder="e.g. 3"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                Description
              </label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what this quiz covers, its difficulty level, target audience, etc."
                className="w-full px-5 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Options */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Quiz Options</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                {[
                  { key: "is_free", label: "Free Quiz" },
                  { key: "negative_marking", label: "Enable Negative Marking" },
                  { key: "show_hints", label: "Show Hints During Quiz" },
                  { key: "show_explanations", label: "Show Explanations After Submit" },
                  { key: "shuffle_questions", label: "Shuffle Question Order" },
                  { key: "shuffle_options", label: "Shuffle Answer Options" },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                      className="w-6 h-6 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!form.is_free && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 299"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}

              {form.negative_marking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Negative Marks per Wrong Answer
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={form.negative_marks_per_question}
                    onChange={(e) =>
                      setForm({ ...form, negative_marks_per_question: e.target.value })
                    }
                    placeholder="e.g. 0.25"
                    className="w-full px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-lg font-semibold text-gray-800 mb-3">
                Publication Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full max-w-xs px-5 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="draft">Draft (Hidden from students)</option>
                <option value="published">Published (Live)</option>
              </select>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-8 border-t">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg transition flex items-center gap-3"
              >
                {loading && <Loader2 className="w-6 h-6 animate-spin" />}
                {loading
                  ? "Saving..."
                  : mode === "create"
                  ? "Create Quiz"
                  : "Update Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateQuiz;