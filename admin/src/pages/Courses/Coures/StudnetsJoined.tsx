import  { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useParams } from "react-router";

interface JoinedStudent {
  userId: string | number;
  userName: string;
  joinCount: number;
  leaveCount: number;
  latestStatus: "joined" | "left";
}

const StudentsJoined = () => {
  const [data, setData] = useState<JoinedStudent[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { id } = useParams(); // ✅ get id from URL

  const VIDEO_ID = id;
  const API_URL = `http://localhost:5001/api/chat/joined-student/${VIDEO_ID}`;

  const fetchJoinedStudents = useCallback(async () => {
    try {
      const res = await axios.get(API_URL);

      if (res.data?.success) {
        setData(res.data.users || []);
        setTotalUsers(res.data.totalUsers || 0);
        setError(null);
      }
    } catch (err: unknown) {
      console.error(err);
      setError("Failed to load joined students");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  // 🔁 Poll every 5 seconds
  useEffect(() => {
    fetchJoinedStudents();
    const interval = setInterval(fetchJoinedStudents, 5000);
    return () => clearInterval(interval);
  }, [fetchJoinedStudents]);

  // 🔍 SEARCH FILTER
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    return data.filter((user) =>
      user.userName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, data]);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading students...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>;
  }

  return (
    <div className="p-3 border rounded bg-white dark:bg-gray-800 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Students Joined ({totalUsers})
        </h3>

        <input
          type="text"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-xs px-2 py-1 border rounded focus:outline-none dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* 🔽 SCROLLABLE LIST */}
      <div className="max-h-[300px] overflow-y-auto pr-1">
        {filteredData.length === 0 ? (
          <p className="text-xs text-gray-500 text-center mt-4">
            No matching students
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredData.map((user) => (
              <li
                key={user.userId}
                className="flex justify-between items-center text-xs border-b pb-1"
              >
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {user.userName}
                  </p>
                  <p className="text-gray-500">
                    Joined: {user.joinCount} | Left: {user.leaveCount}
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold
                    ${
                      user.latestStatus === "joined"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                >
                  {user.latestStatus.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default StudentsJoined;
