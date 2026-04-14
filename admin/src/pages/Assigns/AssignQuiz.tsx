import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { API_URL } from "../../constant/constant";
import { toast } from "react-hot-toast";

interface Quiz {
  id: number;
  title: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const AssignQuiz = () => {
  const { id: userId } = useParams();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assignedQuizIds, setAssignedQuizIds] = useState<number[]>([]);
  const [quizLimits, setQuizLimits] = useState<{ [key: number]: number }>({});

  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [revoking, setRevoking] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ================= Fetch Assigned ================= */

  const fetchAssignedQuizzes = async () => {
    try {
      const res = await axios.get(`${API_URL}/orders/admin/user/${userId}/quizzes`);

      const ids = res.data.items.map((q: any) => q.quizId);

      setAssignedQuizIds(ids);

    } catch (err) {
      console.error("Failed to fetch assigned quizzes");
    }
  };

  /* ================= Fetch Quizzes ================= */

  const fetchQuizzes = async (page: number = 1, searchValue: string = "") => {
    try {

      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        is_admin: "true",
        limit: "10",
        ...(searchValue ? { search: searchValue } : {}),
      });

      const res = await axios.get(
        `${API_URL}/quiz/quizzes?${params.toString()}`
      );

      const { data, pagination: pag } = res.data;

      setQuizzes(data || []);
      setPagination(pag);
      setCurrentPage(page);

    } catch (err) {
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  /* ================= Assign Quiz ================= */

  const handleAssignQuiz = async (quizId: number) => {

    const quizLimit = quizLimits[quizId] || 3;

    try {

      setAssigning(quizId);

      await axios.post(`${API_URL}/orders/admin/assign-quiz`, {
        userId,
        quizId,
        quizLimit
      });

      toast.success("Quiz assigned");

      setAssignedQuizIds((prev) => [...prev, quizId]);

    } catch (err) {
      toast.error("Assign failed");
    } finally {
      setAssigning(null);
    }
  };

  /* ================= Revoke Quiz ================= */

  const handleRevokeQuiz = async (quizId: number) => {

    const reason = prompt("Reason for revoking quiz?") || "Admin revoked";

    try {

      setRevoking(quizId);

      await axios.post(`${API_URL}/orders/admin/revoke-quiz`, {
        userId,
        quizId,
        reason
      });

      toast.success("Quiz revoked");

      setAssignedQuizIds((prev) =>
        prev.filter((id) => id !== quizId)
      );

    } catch (err) {
      toast.error("Failed to revoke quiz");
    } finally {
      setRevoking(null);
    }
  };

  /* ================= Effects ================= */

  useEffect(() => {
    fetchQuizzes();
    fetchAssignedQuizzes();
  }, []);

  return (
    <div className="p-6 space-y-6">

      <h2 className="text-xl font-semibold">Assign Quiz</h2>

      {/* Search */}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search quiz..."
          className="border p-2 rounded w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded"
          onClick={() => fetchQuizzes(1, search)}
        >
          Search
        </button>
      </div>

      {/* Quiz List */}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

          {quizzes.map((quiz) => {

            const isAssigned = assignedQuizIds.includes(quiz.id);

            return (
              <div
                key={quiz.id}
                className={`border rounded-lg p-4 space-y-3 ${
                  isAssigned ? "bg-green-50 border-green-300" : ""
                }`}
              >

                <div className="flex justify-between">

                  <h3 className="font-medium">{quiz.title}</h3>

                  {isAssigned && (
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                      Assigned
                    </span>
                  )}

                </div>

                {/* Quiz Limit */}

                {!isAssigned && (
                  <input
                    type="number"
                    min={1}
                    placeholder="Attempt Limit"
                    className="border p-2 rounded w-full"
                    value={quizLimits[quiz.id] || ""}
                    onChange={(e) =>
                      setQuizLimits({
                        ...quizLimits,
                        [quiz.id]: Number(e.target.value),
                      })
                    }
                  />
                )}

                {/* Actions */}

                {!isAssigned ? (
                  <button
                    disabled={assigning === quiz.id}
                    onClick={() => handleAssignQuiz(quiz.id)}
                    className="bg-green-600 text-white w-full py-2 rounded"
                  >
                    {assigning === quiz.id ? "Assigning..." : "Assign"}
                  </button>
                ) : (
                  <button
                    disabled={revoking === quiz.id}
                    onClick={() => handleRevokeQuiz(quiz.id)}
                    className="bg-red-600 text-white w-full py-2 rounded"
                  >
                    {revoking === quiz.id ? "Revoking..." : "Revoke"}
                  </button>
                )}

              </div>
            );
          })}

        </div>
      )}

      {/* Pagination */}

      <div className="flex justify-center gap-3">

        <button
          disabled={currentPage === 1}
          onClick={() => fetchQuizzes(currentPage - 1, search)}
          className="border px-3 py-1 rounded"
        >
          Prev
        </button>

        <span>
          Page {currentPage} / {pagination.totalPages}
        </span>

        <button
          disabled={currentPage === pagination.totalPages}
          onClick={() => fetchQuizzes(currentPage + 1, search)}
          className="border px-3 py-1 rounded"
        >
          Next
        </button>

      </div>

    </div>
  );
};

export default AssignQuiz;