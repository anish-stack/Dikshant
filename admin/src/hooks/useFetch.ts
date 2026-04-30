import { useState, useEffect, useCallback } from "react";
import api from "../utils/axiosInstance";
import { Toast, ToastAPI,ToastType } from "../utils/types";

export function useToast(): { toasts: Toast[] } & ToastAPI {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const add = (msg: string, type: ToastType) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };
  return { toasts, success: (m) => add(m, "success"), error: (m) => add(m, "error") };
}

export function useFetch<T>(endpoint: string, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data?: T[] } | T[]>(endpoint);
      const raw = r.data;
      setData(Array.isArray(raw) ? raw : (raw as { data?: T[] }).data ?? []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, deps);

  return { data, setData, loading, refetch: fetch };
}