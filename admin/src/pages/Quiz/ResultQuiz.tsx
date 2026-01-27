import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Chart from "react-apexcharts";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  Loader2,
  User,
  Calendar,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

interface Option {
  id: number;
  option_text: string;
  is_correct: number;
}

interface Question {
  questionId: number;
  questionText: string;
  userSelectedOptionId: number | null;
  correctOptionId: number;
  isCorrect: boolean;
  marksAwarded: number;
  marksTotal: number;
  options: Option[];
  explanation?: string;
  hint?: string;
}

interface ResultData {
  attemptId: number;
  attemptNumber: number;
  status: string;
  score: string;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    mobile: string;
  };
  quiz: {
    id: number;
    title: string;
    passingMarks: number;
  };
  questions: Question[];
}

const ResultQuiz = () => {
  const { id: attemptId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    if (attemptId) fetchResult();
  }, [attemptId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      const res = await axios.get(
        `${API_URL}/quiz/admin/results/${attemptId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data.success) {
        setResult(res.data.data);
      } else {
        toast.error("Failed to load result");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching result");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-96 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-gray-600">Loading your quiz result...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-gray-600">No result found</p>
      </div>
    );
  }

  // Helper to get option text by ID
  const getOptionText = (options: Option[], optionId: number | null) => {
    if (!optionId) return <span className="text-gray-500">Not Answered</span>;
    const opt = options.find((o) => o.id === optionId);
    return opt ? opt.option_text : "Unknown";
  };

  const correctCount = result.questions.filter((q) => q.isCorrect).length;
  const incorrectCount = result.questions.length - correctCount;

  /* ---------- Radial Chart Config ---------- */
  const chartOptions = {
    chart: { type: "radialBar" as const },
    labels: ["Score"],
    colors: [result.passed ? "#22c55e" : "#ef4444"],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 270,
        hollow: { size: "70%" },
        track: { background: "#e5e7eb", strokeWidth: "100%" },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 8,
            fontSize: "32px",
            fontWeight: 800,
            color: result.passed ? "#22c55e" : "#ef4444",
            formatter: () => `${result.percentage}%`,
          },
        },
      },
    },
    stroke: { lineCap: "round" },
  };

  const chartSeries = [result.percentage];

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 rounded-xl bg-white shadow hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quiz Result</h1>
            <p className="text-gray-600 mt-1">{result.quiz.title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            Attempt #{result.attemptNumber}
          </p>
          <p className="text-sm text-gray-500">
            Submitted on {new Date(result.submittedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Radial Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center">
          <Chart
            options={chartOptions}
            series={chartSeries}
            type="radialBar"
            height={300}
            width={300}
          />
          <div className="mt-6 text-center">
            <p className="text-5xl font-bold text-gray-900">
              {result.score} / {result.totalMarks}
            </p>
            <p className="text-lg text-gray-600 mt-2">Total Score</p>
          </div>
        </div>

        {/* User & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <User className="w-10 h-10 text-indigo-600" />
              <div>
                <h3 className="text-xl font-semibold">{result.user.name}</h3>
                <p className="text-gray-600">{result.user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <Stat
                label="Correct"
                value={correctCount}
                color="text-green-600"
              />
              <Stat
                label="Incorrect"
                value={incorrectCount}
                color="text-red-600"
              />
              <Stat
                label="Percentage"
                value={`${result.percentage}%`}
                color="text-indigo-600"
              />
              <Stat
                label="Status"
                value={result.passed ? "PASSED" : "FAILED"}
                color={result.passed ? "text-green-600" : "text-red-600"}
                icon={
                  result.passed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )
                }
              />
            </div>
          </div>

          {/* Passing Info */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg opacity-90">Passing Marks Required</p>
                <p className="text-3xl font-bold mt-2">
                  {result.quiz.passingMarks}
                </p>
              </div>
              <Trophy className="w-16 h-16 opacity-80" />
            </div>
            {result.passed ? (
              <p className="mt-4 text-xl font-semibold bg-white/20 rounded-lg px-4 py-2 inline-block">
                🎉 Congratulations! You passed the quiz.
              </p>
            ) : (
              <p className="mt-4 text-xl font-semibold bg-white/20 rounded-lg px-4 py-2 inline-block">
                Keep practicing! You'll get it next time.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Question-wise Analysis */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <Trophy className="w-7 h-7 text-yellow-500" />
          Question-wise Analysis ({result.questions.length} Questions)
        </h3>

        <div className="space-y-5">
          {result.questions.map((q, index) => {
            const userOption = q.options.find(
              (opt) => opt.id === q.userSelectedOptionId,
            );
            const correctOption = q.options.find(
              (opt) => opt.id === q.correctOptionId,
            );

            return (
              <div
                key={q.questionId}
                className={`border-2 rounded-xl p-5 transition-all ${
                  q.isCorrect
                    ? "border-green-300 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <p className="font-semibold text-lg">
                    Q{index + 1}. {q.questionText}
                  </p>
                  {q.isCorrect ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">
                      Your Answer:
                    </span>{" "}
                    <span
                      className={!q.isCorrect ? "text-red-700 font-medium" : ""}
                    >
                      {userOption ? userOption.option_text : "Not Answered"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">
                      Correct Answer:
                    </span>{" "}
                    <span className="text-green-700 font-medium">
                      {correctOption?.option_text}
                    </span>
                  </div>
                </div>

                {q.explanation && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Explanation:
                    </p>
                    <p className="text-sm text-gray-800">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* Reusable Stat Component */
const Stat = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: any;
  color: string;
  icon?: React.ReactNode;
}) => (
  <div className="text-center">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <div
      className={`text-2xl font-bold ${color} flex items-center justify-center gap-2`}
    >
      {icon}
      {value}
    </div>
  </div>
);

export default ResultQuiz;
