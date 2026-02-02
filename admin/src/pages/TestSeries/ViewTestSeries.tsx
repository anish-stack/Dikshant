import  { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Loader2,
  Edit,
  Users,
  FileText,
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  IndianRupee,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

const ViewTestSeries = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testSeries, setTestSeries] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestSeries = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const response = await axios.get(`${API_URL}/testseriess/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data) {
          setTestSeries(response.data.data || response.data);
        } else {
          toast.error("Test series not found");
        }
      } catch (err) {
        toast.error("Failed to load test series");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchTestSeries();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!testSeries) {
    return (
      <div className="text-center py-20 bg-gray-50">
        <p className="text-2xl text-gray-600">Test Series Not Found</p>
      </div>
    );
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to List</span>
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header with Image */}
          <div className="relative">
            <img
              src={testSeries.imageUrl}
              alt={testSeries.title}
              className="w-full h-64 object-cover"
              onError={(e: any) => {
                e.target.src = "https://via.placeholder.com/1200x400?text=Test+Series+Image";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            
            <div className="absolute bottom-6 left-6 text-white">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{testSeries.title}</h1>
              <div className="flex items-center gap-3">
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                    testSeries.status === "featured"
                      ? "bg-purple-600"
                      : testSeries.status === "popular"
                      ? "bg-blue-600"
                      : "bg-gray-600"
                  }`}
                >
                  {testSeries.status.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  testSeries.isActive ? "bg-green-600" : "bg-red-600"
                }`}>
                  {testSeries.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Description */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed">{testSeries.description}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-bold text-gray-900">
                  {testSeries.timeDurationForTest} min
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Type</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {testSeries.type}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Passing Marks</p>
                <p className="text-lg font-bold text-gray-900">
                  {testSeries.passing_marks}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 text-center">
                <IndianRupee className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Price</p>
                <div className="flex items-center justify-center gap-2">
                  {testSeries.discountPrice < testSeries.price && (
                    <span className="text-sm text-gray-500 line-through">
                      ₹{testSeries.price}
                    </span>
                  )}
                  <span className="text-xl font-bold text-gray-900">
                    ₹{testSeries.discountPrice || testSeries.price}
                  </span>
                </div>
              </div>
            </div>

            {/* Important Dates */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                Important Dates
              </h2>
              <div className="space-y-3 bg-gray-50 rounded-xl p-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Test Start</span>
                  <span className="font-medium">{formatDateTime(testSeries.testStartTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Submission Opens</span>
                  <span className="font-medium">{formatDateTime(testSeries.AnswerSubmitDateAndTime)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="font-medium">Last Submission</span>
                  <span className="font-bold">{formatDateTime(testSeries.AnswerLastSubmitDateAndTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Series Expires</span>
                  <span className="font-medium">{formatDate(testSeries.expirSeries)}</span>
                </div>
              </div>
            </div>

            {/* Admin Action Buttons */}
            <div className="border-t pt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Admin Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => navigate(`/admin/testseries/edit/${id}`)}
                  className="flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-xl font-semibold transition shadow-md"
                >
                  <Edit className="w-5 h-5" />
                  Edit Test Series
                </button>

                <button
                  onClick={() => navigate(`/admin/testseries/purchases/${id}`)}
                  className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-semibold transition shadow-md"
                >
                  <Users className="w-5 h-5" />
                  View Purchases
                </button>

                <button
                  onClick={() => navigate(`/admin/testseries/submissions/${id}`)}
                  className="flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-xl font-semibold transition shadow-md"
                >
                  <FileText className="w-5 h-5" />
                  View Submissions
                </button>
              </div>
            </div>

            {/* File Status Indicators */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">File Status</h3>
              <div className="flex gap-6">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${testSeries.questionPdf ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {testSeries.questionPdf ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <div>
                    <p className="font-medium">Question Paper</p>
                    <p className="text-xs">{testSeries.questionPdf ? "Uploaded" : "Not uploaded"}</p>
                  </div>
                </div>

                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${testSeries.answerkey ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                  {testSeries.answerkey ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <div>
                    <p className="font-medium">Answer Key</p>
                    <p className="text-xs">{testSeries.answerkey ? "Uploaded" : "Not uploaded"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTestSeries;