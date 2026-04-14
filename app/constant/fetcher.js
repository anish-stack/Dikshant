import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL_LOCAL_ENDPOINT, LOCAL_ENDPOINT } from "./api";

const api = axios.create({
  baseURL: __DEV__ ? LOCAL_ENDPOINT : API_URL_LOCAL_ENDPOINT,
});

// Attach token from AsyncStorage
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(token)
  } catch (err) {
    console.log("Token read error:", err);
  }
  return config;
});

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.log("API Error:", error.response.data);
    return Promise.reject(error);
  }
);

// ✔ Correct fetcher (DO NOT repeat API_URL_ENDPOINT because api already has baseURL)
export const fetcher = (url) =>
  api.get(url).then((res) => res.data);

export default api;
