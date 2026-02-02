import { useState, useEffect } from "react";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";


export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL_LOCAL_ENDPOINT}/appsettings`);
      setSettings(response.data[0] || response.data); // assuming API returns array
      setError(null);
    } catch (err) {
      console.error("Error fetching app settings:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, error, refetch: fetchSettings };
};
