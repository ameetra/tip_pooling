import { get, post, patch, del } from './client';

export interface Manager {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export const usersApi = {
  list: () => get<Manager[]>('/users'),
  create: (email: string, password: string) => post<Manager>('/users', { email, password }),
  remove: (id: string) => del(`/users/${id}`),
  resetPassword: (id: string, password: string) => patch(`/users/${id}/password`, { password }),
};
