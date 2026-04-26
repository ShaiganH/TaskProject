
// Every API call in the app goes through this instance.
// It automatically:
//   1. Attaches the access token to every request
//   2. Catches 401 errors
//   3. Silently refreshes the token
//   4. Retries the original request
//   5. Logs out if refresh fails

import axios from 'axios';

const BASE_URL = "http://43.205.113.144";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export const axiosAuth = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Request Interceptor ────────────────────────────────────────────────────
// Runs before EVERY request — attaches access token from memory
axiosInstance.interceptors.request.use(
  (config) => {
    // getAccessToken() reads from our in-memory store (see authStore.js)
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────
// Runs after EVERY response — handles 401s automatically

let isRefreshing = false;
// Queue of requests that came in while a refresh was already in progress
// They all wait, then retry once the new token arrives
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // 🔴 CRITICAL: if refresh endpoint itself fails → logout immediately
    if (error.config?.url?.includes('/auth/refresh')) {
      clearAccessToken();
      window.location.href = '/login';
      return Promise.reject(error);
    }
    if (!error.response) {
      // network error, don't logout
      return Promise.reject(error);
    }

    // Only handle 401
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }


    // If refresh already in progress → queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axiosAuth.post('/auth/refresh');

      const newAccessToken = data.accessToken;

      setAccessToken(newAccessToken);

      processQueue(null, newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      // 🔴 FORCE LOGOUT HERE
      processQueue(refreshError, null);
      clearAccessToken();


      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── In-Memory Token Store ──────────────────────────────────────────────────
// Access token lives ONLY in memory — not localStorage, not sessionStorage
// This is the most XSS-resistant place to store it
// It "dies" when the page closes, but the HttpOnly cookie keeps the session alive

let _accessToken = null;

export const getAccessToken = () => _accessToken;
export const setAccessToken = (token) => { _accessToken = token; };
export const clearAccessToken = () => { _accessToken = null; };

export default axiosInstance;
