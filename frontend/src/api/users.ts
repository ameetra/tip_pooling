import { get, post, patch, del } from './client';

export type StaffRole = 'MANAGER' | 'SHIFT_LEAD';

export interface Staff {
  id: string;
  email: string;
  role: StaffRole;
  createdAt: string;
}

export const usersApi = {
  list: () => get<Staff[]>('/users'),
  create: (email: string, password: string, role: StaffRole) => post<Staff>('/users', { email, password, role }),
  remove: (id: string) => del(`/users/${id}`),
  resetPassword: (id: string, password: string) => patch(`/users/${id}/password`, { password }),
};
