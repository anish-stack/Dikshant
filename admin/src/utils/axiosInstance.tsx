import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import { API_URL } from "../constant/constant";
import toast from "react-hot-toast";

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ================= REQUEST ================= */

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("API Request:", {
      url: config.url,
      method: config.method,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  }
);

/* ================= RESPONSE ================= */

api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log("API Success:", response.config.url, response.data);
    return response;
  },

  async (error: any) => {
    console.error("API Error Full:", error);
    console.error("API Error Response:", error?.response);
    console.error("API Error Data:", error?.response?.data);
 const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong";
    const originalRequest =
      error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
  toast.error(message);
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      localStorage.clear();

      setTimeout(() => {
        window.location.href = "/login";
      }, 1000); // delay so logs visible
    }

    return Promise.reject(error);
  }
);

export default api;