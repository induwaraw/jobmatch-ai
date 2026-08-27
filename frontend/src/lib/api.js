/**
 * Axios instance for the JobMatch AI backend.
 *
 * The token is held in a module variable rather than read from localStorage on
 * every request, so the auth context stays the single source of truth. It is
 * also restored from localStorage on load so a refresh does not log you out.
 */

import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "jobmatch.token";

let authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || null;

export function getToken() {
  return authToken;
}

export function setToken(token) {
  authToken = token || null;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// No default Content-Type on purpose. Axios sets application/json for plain
// object bodies and multipart with the right boundary for FormData. Pinning it
// here would break file uploads, because the boundary would be missing.
export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/**
 * Upload a CV file. Axios builds the multipart body from the FormData.
 */
export function uploadCv(file) {
  const form = new FormData();
  form.append("file", file);
  return api.post("/api/cv/upload", form);
}

/**
 * Pull a readable message out of a FastAPI error response.
 * FastAPI sends a string detail for our own errors and an array of objects
 * for validation failures, so both shapes need handling.
 */
export function errorMessage(error, fallback = "Something went wrong.") {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : null;
    return field ? `${field}: ${first.msg}` : first.msg;
  }

  if (error?.code === "ERR_NETWORK") {
    return "Cannot reach the server. Is the backend running on port 8000?";
  }

  return fallback;
}
