import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { LOCAL_ENDPOINT } from "../constant/api";

export const useAppAssets = () => {
  const [assets, setAssets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(null); // cache | db (optional)

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(`${LOCAL_ENDPOINT}/assets`);

      if (res.data?.success && res.data?.data) {
        setAssets(res.data.data);
        setSource(res.data.source || null);
      } else {
        throw new Error("Invalid assets response");
      }
    } catch (err) {
      console.error("❌ Error fetching app assets:", err);
      setError(err);
      setAssets(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  /* ---------- DERIVED STATES (VERY USEFUL) ---------- */

  const isMaintenanceActive =
    assets?.isMaintenanceMode &&
    (!assets?.maintenanceStartAt ||
      new Date() >= new Date(assets.maintenanceStartAt)) &&
    (!assets?.maintenanceEndAt ||
      new Date() <= new Date(assets.maintenanceEndAt));

  const isAlertActive =
    assets?.alert_enabled &&
    (!assets?.alert_start_at ||
      new Date() >= new Date(assets.alert_start_at)) &&
    (!assets?.alert_end_at ||
      new Date() <= new Date(assets.alert_end_at));

  return {
    assets,          // 🔥 main app assets object
    loading,
    error,
    source,          // cache / db (optional)
    isMaintenanceActive,
    isAlertActive,
    refetch: fetchAssets,
  };
};
