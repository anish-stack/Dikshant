import React, { useEffect, useState, useMemo } from "react";
import axios, { isAxiosError } from "axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Upload, Info, HelpCircle } from "lucide-react";
import { API_URL } from "../../constant/constant";
import Swal from "sweetalert2";

type Mode = "create" | "edit";

interface FormData {
  title: string;
  description: string;
  displayIn: "Quiz" | "TestSeries";
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
    displayIn: "Quiz",
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
    const q = Number(form.totalQuestions) || 0;
    const t = Number(form.time_per_question) || 0;
    return q > 0 && t > 0 ? Math.round((q * t) / 60) : 0;
  }, [form.totalQuestions, form.time_per_question]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      durationMinutes: String(calculatedDuration),
    }));
  }, [calculatedDuration]);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setMode("edit");
      setQuizId(id);
      fetchQuiz(id);
    }
  }, [searchParams]);

  const fetchQuiz = async (id: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${API_URL}/quiz/quizzes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const q = res.data?.data ?? {};
      setForm({
        title: q.title || "",
        description: q.description || "",
        displayIn: q.displayIn || "Quiz", // assuming backend supports it
        totalQuestions: String(q.totalQuestions || ""),
        time_per_question: String(q.timePerQuestion || ""),
        durationMinutes: String(q.durationMinutes || ""),
        total_marks: String(q.totalMarks || ""),
        passing_marks: String(q.passingMarks || ""),
        negative_marking: !!q.negativeMarking,
        negative_marks_per_question: String(q.negativeMarksPerQuestion || ""),
        is_free: q.isFree ?? true,
        price: String(q.price || ""),
        attempt_limit: String(q.attemptLimit || "1"),
        status: q.status || "draft",
        show_hints: !!q.showHints,
        show_explanations: q.showExplanations ?? true,
        shuffle_questions: q.shuffleQuestions ?? true,
        shuffle_options: q.shuffleOptions ?? true,
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
    if (!file?.type.startsWith("image/")) {
      toast.error("Please select a valid image");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!form.title.trim())
      return Swal.fire({
        title: "Problem With Creating New Quiz",
        text: "Title is Required Feilds",
        timer: 2000,
      });

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(
          key,
          value === true ? "true" : value === false ? "false" : String(value),
        );
      });

      if (imageFile) formData.append("image", imageFile);

      const url =
        mode === "create"
          ? `${API_URL}/quiz/quizzes`
          : `${API_URL}/quiz/quizzes/${quizId}`;

      await axios({
        method: mode === "create" ? "post" : "put",
        url,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(`Quiz ${mode === "create" ? "created" : "updated"}!`);
      setTimeout(() => navigate("/all-quizzes"), 1400);
    } catch (err) {
      const msg = isAxiosError(err)
        ? err.response?.data?.message || "Failed"
        : "Network error";

      Swal.fire({
        title: "Problem With Creating New Quiz",
        text: msg,
        timer: 2000,
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50/70 py-6 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">
              {mode === "create"
                ? "Create Quiz / Test Series"
                : "Edit Quiz / Test Series"}
            </h1>
            <p className="text-sm text-gray-600 mt-1.5">
              Fill essential details • Save as draft or publish directly
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-8">
            {/* Cover Image - Compact */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                Cover Image{" "}
                <HelpCircle
                  className="w-4 h-4 text-gray-400"
                  title="Recommended: 1200×628 px, < 500 KB"
                />
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative w-44 h-44 flex-shrink-0">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg shadow-sm border"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                </div>

                <label className="cursor-pointer px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition flex items-center gap-2 shadow-sm">
                  <Upload className="w-4 h-4" />
                  {imagePreview ? "Change" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Core Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. SSC CGL 2026 – Full Mock Test"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Keep it clear & attractive for students
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Display As
                </label>
                <select
                  value={form.displayIn}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      displayIn: e.target.value as "Quiz" | "TestSeries",
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                >
                  <option value="Quiz">Standalone Quiz</option>
                  <option value="TestSeries">Part of Test Series</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose how this appears in student dashboard
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Questions <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.totalQuestions}
                  onChange={(e) =>
                    setForm({ ...form, totalQuestions: e.target.value })
                  }
                  placeholder="e.g. 100"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  Time per Question (sec)
                  <HelpCircle
                    className="w-4 h-4 text-gray-400"
                    title="Typical: 45–90 sec"
                  />
                </label>
                <input
                  type="number"
                  min="10"
                  value={form.time_per_question}
                  onChange={(e) =>
                    setForm({ ...form, time_per_question: e.target.value })
                  }
                  placeholder="e.g. 60"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  Duration (minutes)
                  <Info
                    className="w-4 h-4 text-blue-500"
                    title="Auto-calculated"
                  />
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={calculatedDuration || "—"}
                    disabled
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Scoring & Attempts – Compact row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Total Marks
                </label>
                <input
                  type="number"
                  value={form.total_marks}
                  onChange={(e) =>
                    setForm({ ...form, total_marks: e.target.value })
                  }
                  placeholder="e.g. 200"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Passing Marks
                </label>
                <input
                  type="number"
                  value={form.passing_marks}
                  onChange={(e) =>
                    setForm({ ...form, passing_marks: e.target.value })
                  }
                  placeholder="e.g. 120"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Attempt Limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.attempt_limit}
                  onChange={(e) =>
                    setForm({ ...form, attempt_limit: e.target.value })
                  }
                  placeholder="e.g. 3"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Toggles – Compact grid */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Quiz Behaviour
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                {[
                  { key: "is_free", label: "Free Access" },
                  { key: "negative_marking", label: "Negative Marking" },
                  { key: "show_hints", label: "Show Hints" },
                  { key: "show_explanations", label: "Show Explanations" },
                  { key: "shuffle_questions", label: "Shuffle Questions" },
                  { key: "shuffle_options", label: "Shuffle Options" },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={(form as any)[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.checked })
                      }
                      className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900 transition">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Conditional fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {!form.is_free && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="e.g. 249"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {form.negative_marking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Negative Marks per Wrong
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={form.negative_marks_per_question}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        negative_marks_per_question: e.target.value,
                      })
                    }
                    placeholder="e.g. 0.33 or 1"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Description – smaller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Target audience, topics covered, difficulty level..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Status & Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-6 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as any })
                  }
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[220px]"
                >
                  <option value="draft">Draft – Not visible</option>
                  <option value="published">Published – Live now</option>
                </select>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition flex items-center gap-2 min-w-[180px] justify-center"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading
                  ? "Saving..."
                  : mode === "create"
                    ? "Create"
                    : "Update"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateQuiz;
