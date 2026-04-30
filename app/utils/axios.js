import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";

const api = axios.create({
  baseURL: API_URL_LOCAL_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Optional: good practice for mobile
});

/* ================= REQUEST INTERCEPTOR ================= */

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("authToken");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      console.log("API Request:", {
        url: config.url,
        method: config.method,
        // Avoid logging sensitive data in production
        // data: config.data,
      });

    } catch (err) {
      console.warn("Failed to get auth token from AsyncStorage:", err);
    }

    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  }
);

/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(
  (response) => {
    console.log("API Success:", response.config.url, response.data);
    return response;
  },

  async (error) => {
    console.error("API Error Full:", error);
    console.error("API Error Response:", error?.response);
    console.error("API Error Data:", error?.response?.data);

    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Something went wrong";

    const originalRequest = error.config 


    // Handle 401 Unauthorized
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      try {
        // Clear all stored auth data
        await AsyncStorage.multiRemove([
          "authToken",
          "refreshToken",   // if you store refresh token
          "userData",
        ]);
      } catch (err) {
        console.warn("Failed to clear AsyncStorage:", err);
      }

   
      setTimeout(() => {
       
        console.log("Redirecting to Login...");
        
       
      }, 1200);
    }

    return Promise.reject(error);
  }
);

export default api;