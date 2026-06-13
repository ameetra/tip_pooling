import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

// Unwrap { success, data } envelope; surface the API's error message on both
// envelope errors (2xx with success:false) and HTTP errors (4xx/5xx).
function apiError(payload: any, fallback: Error) {
  const e = payload?.error;
  if (!e?.message) return fallback;
  const err = new Error(e.message);
  (err as any).code = e.code;
  (err as any).details = e.details;
  return err;
}

api.interceptors.response.use(
  (res) => {
    if (res.data?.success === false) throw apiError(res.data, new Error('Request failed'));
    return res.data.data;
  },
  (error) => {
    throw apiError(error.response?.data, error);
  },
);

export default api;

// Typed helpers (axios interceptor returns unwrapped data)
export const get = <T>(url: string) => api.get(url) as unknown as Promise<T>;
export const post = <T>(url: string, data?: unknown) => api.post(url, data) as unknown as Promise<T>;
export const patch = <T>(url: string, data?: unknown) => api.patch(url, data) as unknown as Promise<T>;
export const del = <T = void>(url: string) => api.delete(url) as unknown as Promise<T>;
