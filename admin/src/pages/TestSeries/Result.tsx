import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  Upload,
  CheckCircle,
  FileText,
  Edit3,
  Eye,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

interface Submission {
  id: number;
  User?: { name: string; email: string };
  answerSheetUrls: string[];
  answerCheckedUrl?: string;
  marksObtained?: number | null;
  totalMarks?: number | null;
  resultGenerated: boolean;
  reviewStatus: string;
  reviewComment?: string | null;
}

const Result = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Modal states
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [obtainedMarksInput, setObtainedMarksInput] = useState("");
  const [totalMarksInput, setTotalMarksInput] = useState("100");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatusInput, setReviewStatusInput] = useState("approved");
  const [reviewCommentInput, setReviewCommentInput] = useState("");

  /* ---------------- FETCH SUBMISSION ---------------- */
  const fetchSubmissions = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      const res = await axios.get(`${API_URL}/testseriess/submission-one/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched submission:", res.data?.data);

      if (res?.data?.success) {
        const data = res.data.data;

        const parsedUrls = Array.isArray(data.answerSheetUrls)
          ? data.answerSheetUrls
          : data.answerSheetUrls
          ? JSON.parse(data.answerSheetUrls)
          : [];

        setSubmission({
          ...data,
          answerSheetUrls: parsedUrls,
          answerCheckedUrl: data.answerCheckedUrl || null,
          marksObtained: data.marksObtained ?? null,
          totalMarks: data.totalMarks ?? null,
          reviewStatus: data.reviewStatus || "pending",
          reviewComment: data.reviewComment || null,
        });

        // Pre-fill marks modal if values exist
        if (data.marksObtained !== null && data.marksObtained !== undefined) {
          setObtainedMarksInput(String(data.marksObtained));
        }
        if (data.totalMarks !== null && data.totalMarks !== undefined) {
          setTotalMarksInput(String(data.totalMarks));
        }

        // Pre-fill review modal
        setReviewStatusInput(data.reviewStatus || "pending");
        setReviewCommentInput(data.reviewComment || "");
      } else {
        toast.error("Failed to load submission");
        setSubmission(null);
      }
    } catch (err: any) {
      console.error("Error fetching submission:", err);
      toast.error(err.response?.data?.message || "Error loading submission");
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  /* ---------------- UPLOAD CHECKED ANSWER SHEET ---------------- */
  const uploadCheckedSheet = async (file: File) => {
    if (!file || !submission) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload only images or PDF files");
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem("accessToken");
      const formData = new FormData();
      formData.append("file", file);

      await axios.post(
        `${API_URL}/testseriess/admin/submissions/${submission.id}/upload-checked`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      toast.success("Checked answer sheet uploaded successfully!");
      await fetchSubmissions();
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /* ---------------- UPDATE MARKS ---------------- */
  const updateMarks = async () => {
    if (!submission) return;

    const obtained = Number(obtainedMarksInput);
    const total = Number(totalMarksInput);

    if (isNaN(obtained) || isNaN(total) || obtained < 0 || total <= 0 || obtained > total) {
      toast.error("Please enter valid marks (0 ≤ obtained ≤ total)");
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");

      await axios.put(
        `${API_URL}/testseriess/admin/submissions/${submission.id}/update-marks`,
        { obtainedMarks: obtained, totalMarks: total },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Marks updated: ${obtained}/${total}`);
      setShowMarksModal(false);
      fetchSubmissions();
    } catch (err: any) {
      console.error("Marks update failed:", err);
      toast.error(err.response?.data?.message || "Failed to update marks");
    }
  };

  /* ---------------- PUBLISH RESULT ---------------- */
  const publishResult = async () => {
    if (!submission) return;

    if (!window.confirm("Are you sure you want to publish the result? This cannot be undone.")) {
      return;
    }

    try {
      setPublishing(true);
      const token = localStorage.getItem("accessToken");

      await axios.post(
        `${API_URL}/testseriess/admin/submissions/${submission.id}/publish-result`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Result published successfully!");
      fetchSubmissions();
    } catch (err: any) {
      console.error("Publish failed:", err);
      toast.error(err.response?.data?.message || "Failed to publish result");
    } finally {
      setPublishing(false);
    }
  };

  /* ---------------- UPDATE REVIEW FEEDBACK ---------------- */
  const updateReviewFeedback = async () => {
    if (!submission) return;

    try {
      const token = localStorage.getItem("accessToken");

      await axios.put(
        `${API_URL}/testseriess/admin/submissions/${submission.id}/review`,
        {
          reviewStatus: reviewStatusInput,
          reviewComment: reviewCommentInput.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Review feedback updated successfully!");
      setShowReviewModal(false);
      fetchSubmissions();
    } catch (err: any) {
      console.error("Review update failed:", err);
      toast.error(err.response?.data?.message || "Failed to update review");
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Submission Details</h1>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          </div>
        ) : !submission ? (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <p className="text-gray-500 text-lg">No submission found</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Student Info */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {submission.User?.name || "Unknown Student"}
                  </h2>
                  <p className="text-gray-600 mt-1">{submission.User?.email || "No email"}</p>
                  {(submission.marksObtained !== null || submission.totalMarks !== null) && (
                    <p className="text-xl font-semibold text-indigo-700 mt-4">
                      Marks: {submission.marksObtained ?? "?"} / {submission.totalMarks ?? "?"}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  {submission.resultGenerated && (
                    <span className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg text-sm font-semibold">
                      <CheckCircle size={18} />
                      Result Published
                    </span>
                  )}
                  <div className="text-sm text-gray-600">
                    Review Status:{" "}
                    <span className={`font-medium capitalize ${
                      submission.reviewStatus === "approved" ? "text-green-600" :
                      submission.reviewStatus === "rejected" ? "text-red-600" :
                      "text-amber-600"
                    }`}>
                      {submission.reviewStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submitted Answer Sheets */}
            {submission.answerSheetUrls.length > 0 && (
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Student Submitted Answer Sheets ({submission.answerSheetUrls.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {submission.answerSheetUrls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    >
                      <FileText size={18} />
                      Answer Sheet {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Uploaded Checked Sheet */}
            {submission.answerCheckedUrl && (
              <div className="p-6 border-b border-gray-200 bg-amber-50">
                <h3 className="text-lg font-medium text-amber-900 mb-3">
                  Checked Answer Sheet (Uploaded by Admin)
                </h3>
                <a
                  href={submission.answerCheckedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-amber-800 hover:text-amber-900 underline font-medium text-base"
                >
                  <Eye size={20} />
                  View Checked Copy
                </a>
              </div>
            )}

            {/* Review Comment Display */}
            {submission.reviewComment && (
              <div className="p-6 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-medium text-blue-900 mb-2">Admin Feedback</h3>
                <p className="text-gray-800 whitespace-pre-wrap">{submission.reviewComment}</p>
              </div>
            )}

            {/* Admin Actions */}
            <div className="p-6 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-800 mb-5">Admin Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Upload Checked Sheet */}
                <label
                  className={`cursor-pointer flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition ${
                    uploading
                      ? "border-amber-400 bg-amber-50"
                      : "border-amber-300 bg-amber-50 hover:border-amber-500 hover:bg-amber-100"
                  }`}
                >
                  <Upload size={24} className="text-amber-700 mb-2" />
                  <span className="text-sm font-medium text-amber-900 text-center">
                    {uploading ? "Uploading..." : "Upload Checked Sheet"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    hidden
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCheckedSheet(file);
                    }}
                  />
                </label>

                {/* Update Marks */}
                <button
                  onClick={() => setShowMarksModal(true)}
                  className="flex flex-col items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-xl transition"
                >
                  <Edit3 size={24} className="text-blue-700 mb-2" />
                  <span className="text-sm font-medium text-blue-900">Update Marks</span>
                </button>

                {/* Review Feedback */}
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="flex flex-col items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-xl transition"
                >
                  <MessageSquare size={24} className="text-purple-700 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Review Feedback</span>
                </button>

                {/* Publish Result */}
                <button
                  onClick={publishResult}
                  disabled={publishing || submission.resultGenerated}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition font-medium ${
                    submission.resultGenerated
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : publishing
                      ? "bg-green-400 text-white"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {publishing ? (
                    "Publishing..."
                  ) : submission.resultGenerated ? (
                    "Published"
                  ) : (
                    <>
                      <CheckCircle size={24} className="mb-2" />
                      Publish Result
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Marks Update Modal */}
        {showMarksModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-5">Update Marks</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Obtained Marks</label>
                  <input
                    type="number"
                    value={obtainedMarksInput}
                    onChange={(e) => setObtainedMarksInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 85"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={totalMarksInput}
                    onChange={(e) => setTotalMarksInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 100"
                    min="1"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateMarks}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Update Marks
                </button>
                <button
                  onClick={() => {
                    setShowMarksModal(false);
                    // Reset to current values
                    setObtainedMarksInput(String(submission?.marksObtained ?? ""));
                    setTotalMarksInput(String(submission?.totalMarks ?? "100"));
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Feedback Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl">
              <h3 className="text-xl font-bold text-gray-800 mb-5">Provide Review Feedback</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Review Status</label>
                  <select
                    value={reviewStatusInput}
                    onChange={(e) => setReviewStatusInput(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="needs_revision">Needs Revision</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment (Optional)</label>
                  <textarea
                    value={reviewCommentInput}
                    onChange={(e) => setReviewCommentInput(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Write your feedback for the student..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateReviewFeedback}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg transition"
                >
                  Save Feedback
                </button>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewStatusInput(submission?.reviewStatus || "pending");
                    setReviewCommentInput(submission?.reviewComment || "");
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Result;