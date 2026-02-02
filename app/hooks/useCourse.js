import { useState, useEffect, useCallback, useRef } from "react";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";

export default function useCourse(options = {}) {
  const {
    baseUrl = `${API_URL_LOCAL_ENDPOINT}/batchs`,
    defaultHeaders = { "Content-Type": "application/json" },
  } = options;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const safeSet = (fn) => {
    if (isMounted.current) fn();
  };

  // ------------------------------
  // 🔍 MAIN FETCH (supports search + pagination)
  // ------------------------------
  const fetchCourses = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);

      try {
        const url = `${baseUrl}?page=${page}&limit=${limit}&search=${encodeURIComponent(
          search
        )}`;

        const res = await fetch(url, { headers: defaultHeaders, signal });
        if (!res.ok) throw new Error("Failed to fetch courses");

        const data = await res.json();

        safeSet(() => {
          setItems(data.items || []);
          setTotal(data.total || 0);
          setPages(data.pages || 1);
        });

        return data;
      } catch (err) {
        if (err.name === "AbortError") return;
        safeSet(() => setError(err));
      } finally {
        safeSet(() => setLoading(false));
      }
    },
    [page, limit, search, baseUrl, defaultHeaders]
  );

  // Auto fetch when page / limit / search changes
  useEffect(() => {
    const ctrl = new AbortController();
    fetchCourses(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchCourses]);

  // Manual refresh method
  const refresh = useCallback(() => {
    const ctrl = new AbortController();
    fetchCourses(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchCourses]);

  // ------------------------------
  // 📘 FETCH SINGLE COURSE
  // ------------------------------
  const fetchCourse = useCallback(
    async (id, signal) => {
      try {
        const res = await fetch(`${baseUrl}/${id}`, {
          headers: defaultHeaders,
          signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch course ${id}`);
        return await res.json();
      } catch (err) {
        if (err.name === "AbortError") return;
        throw err;
      }
    },
    [baseUrl, defaultHeaders]
  );

  return {
    items,
    total,
    pages,
    page,
    limit,
    search,

    loading,
    error,

    setPage,
    setLimit,
    setSearch,

    fetchCourse,
    refresh,
  };
}
