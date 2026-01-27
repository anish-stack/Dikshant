import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  Search,
  User,
  Clock,
  Trophy,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

const AllAttempts = () => {
 const [searchParams] = useSearchParams();
  const quizId = searchParams.get("id"); 
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");

  const [attempts, setAttempts] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  /* ---------------- FETCH ATTEMPTS ---------------- */
  const fetchAttempts = async () => {
    try {
      setLoading(true);

      const res = await axios.get(
        `${API_URL}/quiz/admin/quiz/${quizId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(res.data)
      if (res.data.success) {
        setAttempts(res.data.data);
        setQuiz(res.data.quiz);
      }
    } catch (error) {
      toast.error("Failed to load attempts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, [quizId]);

  /* ---------------- FILTER ---------------- */
  const filteredAttempts = attempts.filter((a) =>
    `${a.user?.name} ${a.user?.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quiz Attempts
          </h1>
          {quiz && (
            <p className="text-sm text-gray-500">
              {quiz.title} • Passing Marks: {quiz.passingMarks}
            </p>
          )}
        </div>

        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search student..."
            className="pl-9 pr-3 py-2 w-full border rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-center">Attempt</th>
              <th className="px-4 py-3 text-center">Score</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Submitted</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  Loading attempts...
                </td>
              </tr>
            ) : filteredAttempts.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-gray-500">
                  No attempts found
                </td>
              </tr>
            ) : (
              filteredAttempts.map((attempt) => (
                <tr
                  key={attempt.attemptId}
                  className="border-t hover:bg-gray-50"
                >
                  {/* Student */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {attempt.user?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {attempt.user?.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Attempt No */}
                  <td className="px-4 py-3 text-center">
                    #{attempt.attemptNumber}
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3 text-center font-semibold">
                    {attempt.score}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    {attempt.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                        <Trophy className="w-3 h-3" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                        Failed
                      </span>
                    )}
                  </td>

                  {/* Submitted */}
                  <td className="px-4 py-3 text-center text-xs text-gray-500">
                    <Clock className="inline w-3 h-3 mr-1" />
                    {attempt.completedAt
                      ? new Date(attempt.completedAt).toLocaleString()
                      : "-"}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() =>
                        navigate(
                          `/admin/quiz-attempts/${attempt.attemptId}/result`
                        )
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Eye className="w-4 h-4" />
                      View Result
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllAttempts;
