import axios from 'axios';

const api = axios.create({ baseURL: '/api/v1' });

// Unwrap { success, data } envelope; throw on API errors
api.interceptors.response.use((res) => {
  if (res.data?.success === false) {
    const err = new Error(res.data.error.message);
    (err as any).code = res.data.error.code;
    (err as any).details = res.data.error.details;
    throw err;
  }
  return res.data.data;
});

export default api;

// Typed helpers (axios interceptor returns unwrapped data)
export const get = <T>(url: string) => api.get(url) as unknown as Promise<T>;
export const post = <T>(url: string, data?: unknown) => api.post(url, data) as unknown as Promise<T>;
export const patch = <T>(url: string, data?: unknown) => api.patch(url, data) as unknown as Promise<T>;
export const del = <T = void>(url: string) => api.delete(url) as unknown as Promise<T>;
