// src/features/auth/utils/axios.ts
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Request interceptor – attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor – global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network / server unreachable
    if (!error.response) {
      return Promise.reject({
        status: 0,
        message: "Server is unreachable. Please try later.",
      });
    }

    const status = error.response.status;

    // Internal server error (e.g. DB down)
    if (status === 500) {
      return Promise.reject({
        status,
        message: "Database is currently unavailable.",
      });
    }

    // Unauthorized – clear session and redirect to login
    if (status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject({
        status,
        message: "Session expired. Please login again.",
      });
    }

    // All other errors
    return Promise.reject({
      status,
      message: error.response.data?.message || "Something went wrong",
    });
  }
);

export default api;