import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from './client';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput, SetRoleRatesInput, ReactivateEmployeeInput } from '../types';

export type EmployeeStatus = 'active' | 'inactive';

// 100 is the API's page maximum.
export const useEmployees = (status: EmployeeStatus = 'active') =>
  useQuery({ queryKey: ['employees', status], queryFn: () => get<Employee[]>(`/employees?status=${status}&limit=100`) });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEmployeeInput) => post<Employee>('/employees', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployeeInput }) => patch<Employee>(`/employees/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useSetRoleRates = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SetRoleRatesInput }) => post<Employee>(`/employees/${id}/role-rates`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useReactivateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReactivateEmployeeInput }) => post<Employee>(`/employees/${id}/reactivate`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/employees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};
