import axios from "axios";

const apiClient = axios.create({
  // завдяки proxy у vite.config.ts достатньо просто '/api'
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Interceptor запиту — автоматично додає токен до кожного запиту
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor відповіді — при 401 розлогінює і перенаправляє
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default apiClient;
