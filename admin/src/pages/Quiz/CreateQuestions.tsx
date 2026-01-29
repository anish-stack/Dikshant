// src/pages/admin/CreateQuestions.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { useParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  Edit,
  FileText,
  GripVertical,
  Check,
  X,
  Circle,
} from "lucide-react";
import { API_URL } from "../../constant/constant";
import * as XLSX from "xlsx";

interface Option {
  option_text: string;
  is_correct: boolean;
}

interface Question {
  id?: number;
  question_text: string;
  marks: number;
  question_type: string;
  explanation?: string;
  hint?: string;
  time_limit?: number;
  order_num: number;
  options?: Option[];
}

interface PreviewRow {
  question_text: string;
  marks: number;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
  hint?: string;
  time_limit?: number;
  order_num?: number;
}

const CreateQuestions: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"single" | "bulk" | "excel" | "view">("view");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Single question state
  const [questionText, setQuestionText] = useState("");
  const [marks, setMarks] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [explanation, setExplanation] = useState("");
  const [hint, setHint] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(-1);

  // Bulk JSON
  const [bulkJson, setBulkJson] = useState("");

  // Excel upload
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/quiz/${quizId}/questions`);
      setQuestions(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizId) fetchQuestions();
  }, [quizId]);

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    setExcelFile(file);
    setShowPreview(false);
    setPreviewRows([]);

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          toast.error("Excel file is empty");
          return;
        }

        const parsed: PreviewRow[] = rows.map((row, idx) => ({
          question_text: (row.question_text || "").toString().trim(),
          marks: Number(row.marks) || 1,
          option_a: (row.option_a || "").toString().trim(),
          option_b: (row.option_b || "").toString().trim(),
          option_c: (row.option_c || "").toString().trim(),
          option_d: (row.option_d || "").toString().trim(),
          correct_answer: (row.correct_answer || "")
            .toString()
            .trim()
            .toUpperCase(),
          explanation: row.explanation?.toString().trim(),
          hint: row.hint?.toString().trim(),
          time_limit: row.time_limit ? Number(row.time_limit) : undefined,
          order_num: row.order_num ? Number(row.order_num) : idx + 1,
        }));

        for (const r of parsed) {
          if (!r.question_text) {
            toast.error("Missing question_text in some row");
            return;
          }
          if (!["A", "B", "C", "D"].includes(r.correct_answer)) {
            toast.error(`Invalid correct_answer: ${r.correct_answer}`);
            return;
          }
          if (!r.option_a || !r.option_b || !r.option_c || !r.option_d) {
            toast.error("All 4 options required");
            return;
          }
        }

        setPreviewRows(parsed);
        setShowPreview(true);
        toast.success(`${parsed.length} questions loaded`);
      } catch (err) {
        console.error("Excel parsing error:", err);
        toast.error("Invalid Excel file format");
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmExcelUpload = async () => {
    if (!excelFile) return;

    const formData = new FormData();
    formData.append("file", excelFile);

    try {
      setLoading(true);
      await axios.post(`${API_URL}/quiz/${quizId}/questions/excel`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Questions uploaded successfully!");
      setExcelFile(null);
      setPreviewRows([]);
      setShowPreview(false);
      fetchQuestions();
      setTab("view");
    } catch (err) {
      const error = err as any;
      toast.error(error.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

const handleAddSingle = async (e: React.FormEvent) => {
  e.preventDefault();

  console.log("▶️ Add Question submit triggered");

  if (!questionText.trim()) {
    console.warn("⚠️ Question text missing");
    return toast.error("Question text required");
  }

  if (options.some((o) => !o.trim())) {
    console.warn("⚠️ One or more options missing", options);
    return toast.error("All options required");
  }

  if (correctOption === -1) {
    console.warn("⚠️ Correct option not selected");
    return toast.error("Select correct answer");
  }

  const formData = new FormData();
  formData.append("question_text", questionText);
  formData.append("marks", marks || "1");
  if (timeLimit) formData.append("time_limit", timeLimit);
  if (explanation) formData.append("explanation", explanation);
  if (hint) formData.append("hint", hint);

  const optionsPayload = options.map((text, i) => ({
    optionText: text,
    isCorrect: i === correctOption,
    orderNum: i + 1,
  }));

  console.log("🧩 Options payload:", optionsPayload);

  formData.append("options", JSON.stringify(optionsPayload));

  try {
    setLoading(true);

    console.log("🚀 Sending request to:", `${API_URL}/quiz/${quizId}/questions`);
    console.log("📦 FormData preview:");

    for (const [key, value] of formData.entries()) {
      console.log(`   ${key}:`, value);
    }

    const res = await axios.post(
      `${API_URL}/quiz/${quizId}/questions`,
      formData
    );

    console.log("✅ Question added successfully:", res.data);

    toast.success("Question added!");

    // reset form
    setQuestionText("");
    setMarks("");
    setTimeLimit("");
    setExplanation("");
    setHint("");
    setOptions(["", "", "", ""]);
    setCorrectOption(-1);

    fetchQuestions();
    setTab("view");
  } catch (err: any) {
    console.error("❌ Add Question failed:", err);

    if (err.response) {
      console.error("📡 API error response:", err.response.data);
      console.error("📡 Status:", err.response.status);
    }

    toast.error(err.response?.data?.message || "Failed to add");
  } finally {
    setLoading(false);
    console.log("⏹ Add Question request finished");
  }
};


  const handleBulkSubmit = async () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed.questions))
        return toast.error("Need 'questions' array");

      await axios.post(`${API_URL}/quiz/${quizId}/questions/bulk`, parsed);
      toast.success("Bulk questions uploaded!");
      setBulkJson("");
      fetchQuestions();
      setTab("view");
    } catch (err) {
      const error = err as any;
      toast.error(error.response?.data?.message || "Invalid format");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await axios.delete(`${API_URL}/quiz/${quizId}/questions/${id}`);
      toast.success("Deleted");
      fetchQuestions();
    } catch (err) {
      const error = err as any;
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.question_text);
    setMarks(question.marks.toString());
    setTimeLimit(question.time_limit?.toString() || "");
    setExplanation(question.explanation || "");
    setHint(question.hint || "");

    if (question.options && question.options.length === 4) {
      setOptions(question.options.map((opt) => opt.option_text));
      const correctIdx = question.options.findIndex((opt) => opt.is_correct);
      setCorrectOption(correctIdx);
    }

    setTab("single");
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setQuestionText("");
    setMarks("");
    setTimeLimit("");
    setExplanation("");
    setHint("");
    setOptions(["", "", "", ""]);
    setCorrectOption(-1);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingQuestion) return;
    if (!questionText.trim()) return toast.error("Question text required");
    if (options.some((o) => !o.trim()))
      return toast.error("All options required");
    if (correctOption === -1) return toast.error("Select correct answer");

    const formData = new FormData();
    formData.append("question_text", questionText);
    formData.append("marks", marks || "1");
    if (timeLimit) formData.append("time_limit", timeLimit);
    if (explanation) formData.append("explanation", explanation);
    if (hint) formData.append("hint", hint);

    const optionsPayload = options.map((text, i) => ({
      optionText: text,
      isCorrect: i === correctOption,
      orderNum: i + 1,
    }));
    formData.append("options", JSON.stringify(optionsPayload));

    try {
      setLoading(true);
      await axios.put(
        `${API_URL}/quiz/${quizId}/questions/${editingQuestion.id}`,
        formData,
      );
      toast.success("Question updated!");
      handleCancelEdit();
      fetchQuestions();
      setTab("view");
    } catch (err) {
      const error = err as any;
      toast.error(error.response?.data?.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="border-b px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Manage Questions
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Quiz ID: {quizId}</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            {["single", "bulk", "excel", "view"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition ${
                  tab === t
                    ? "border-blue-500 text-blue-600 bg-white"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {t === "single"
                  ? "Add Single"
                  : t === "bulk"
                    ? "Bulk JSON"
                    : t === "excel"
                      ? "Excel"
                      : "View All"}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* SINGLE QUESTION */}
            {tab === "single" && (
              <form
                onSubmit={
                  editingQuestion ? handleUpdateQuestion : handleAddSingle
                }
                className="space-y-5 max-w-3xl"
              >
                {editingQuestion && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Editing Question #{editingQuestion.order_num}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" /> Cancel
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Question Text *
                  </label>
                  <textarea
                    rows={3}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your question..."
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Marks *
                    </label>
                    <input
                      type="number"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Time (sec)
                    </label>
                    <input
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      min="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      Hint
                    </label>
                    <input
                      type="text"
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Options *
                  </label>
                  <div className="space-y-2.5">
                    {options.map((opt, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-2.5 border border-gray-200 rounded bg-gray-50"
                      >
                        <button
                          type="button"
                          onClick={() => setCorrectOption(i)}
                          className={`p-1 rounded-full border ${
                            correctOption === i
                              ? "border-green-500 bg-green-100"
                              : "border-gray-300"
                          }`}
                        >
                          <Circle
                            className={`h-4 w-4 ${correctOption === i ? "text-green-600 fill-current" : "text-gray-400"}`}
                          />
                        </button>
                        <span className="font-medium text-sm w-6">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[i] = e.target.value;
                            setOptions(newOpts);
                          }}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                          required
                        />
                      </div>
                    ))}
                  </div>
                  {correctOption === -1 && (
                    <p className="text-red-500 text-xs mt-1.5">
                      Select correct answer
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Explanation
                  </label>
                  <textarea
                    rows={2}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {editingQuestion ? (
                    <>
                      <Check className="h-4 w-4" />
                      Update Question
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Question
                    </>
                  )}
                </button>
              </form>
            )}

            {/* BULK JSON */}
            {tab === "bulk" && (
              <div className="max-w-3xl space-y-4">
                <p className="text-xs text-gray-600">
                  Format:{" "}
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                    {"{ questions: [...] }"}
                  </code>
                </p>
                <textarea
                  rows={16}
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  className="w-full font-mono text-xs border border-gray-300 rounded p-3"
                  placeholder='{"questions": [{"question_text": "Test?", "marks": 2, "options": [{"optionText": "Yes", "isCorrect": true}]}]}'
                />
                <button
                  onClick={handleBulkSubmit}
                  className="px-5 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Upload Bulk
                </button>
              </div>
            )}

            {/* EXCEL UPLOAD */}
            {tab === "excel" && (
              <div className="max-w-5xl space-y-6">
                {!showPreview ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Upload Excel File
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Required: question_text, marks, option_a, option_b,
                      option_c, option_d, correct_answer (A/B/C/D)
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelFileChange}
                      className="block mx-auto text-sm"
                    />
                    {excelFile && (
                      <p className="mt-3 text-green-600 text-xs font-medium">
                        {excelFile.name}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-semibold text-gray-900">
                        Preview ({previewRows.length} Questions)
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowPreview(false);
                            setPreviewRows([]);
                            setExcelFile(null);
                          }}
                          className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1.5"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                        <button
                          onClick={handleConfirmExcelUpload}
                          disabled={loading}
                          className="px-4 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" /> Confirm
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">
                              #
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[200px]">
                              Question
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[120px]">
                              A
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[120px]">
                              B
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[120px]">
                              C
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700 min-w-[120px]">
                              D
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700">
                              Answer
                            </th>
                            <th className="px-3 py-2 text-center font-medium text-gray-700">
                              Marks
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {previewRows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-3 py-2 text-gray-600">
                                {row.order_num || i + 1}
                              </td>
                              <td className="px-3 py-2 text-gray-900">
                                {row.question_text}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {row.option_a}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {row.option_b}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {row.option_c}
                              </td>
                              <td className="px-3 py-2 text-gray-700">
                                {row.option_d}
                              </td>
                              <td className="px-3 py-2 text-center font-medium text-green-600">
                                {row.correct_answer}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-600">
                                {row.marks}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW ALL */}
            {tab === "view" && (
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-center py-16 text-gray-500 text-sm">
                    No questions added yet.
                  </p>
                ) : (
                  questions.map((q) => (
                    <div
                      key={q.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400 mt-0.5" />
                          <h3 className="text-sm font-medium text-gray-900">
                            Q{q.order_num}: {q.question_text}
                          </h3>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(q)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => q.id && handleDelete(q.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {q.options?.map((opt, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded border ${
                              opt.is_correct
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold">
                                {String.fromCharCode(65 + i)}.
                              </span>
                              <span className="text-gray-700">
                                {opt.option_text}
                              </span>
                              {opt.is_correct && (
                                <span className="ml-auto text-green-600 font-medium">
                                  ✓
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex gap-4 text-xs text-gray-600">
                        <span>Marks: {q.marks}</span>
                        {q.time_limit && <span>Time: {q.time_limit}s</span>}
                        {q.explanation && (
                          <span className="truncate max-w-xs">
                            Info: {q.explanation}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateQuestions;
