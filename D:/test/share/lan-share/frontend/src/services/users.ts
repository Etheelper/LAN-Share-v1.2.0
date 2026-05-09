import api from './api';
import type { UserListResponse, UserResponse, UserUpdateRequest } from '@/types';

export const userApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
    role?: string;
    status?: string;
  }) => api.get<UserListResponse>('/users/', { params }).then((r) => r.data),

  create: (data: {
    username: string;
    password: string;
    nickname?: string;
    role?: string;
    storage_quota?: number;
    auto_active?: boolean;
  }) => api.post<UserResponse>('/users/', null, { params: data }).then((r) => r.data),

  get: (userId: number) =>
    api.get<UserResponse>(`/users/${userId}`).then((r) => r.data),

  update: (userId: number, data: UserUpdateRequest) =>
    api.patch<UserResponse>(`/users/${userId}`, data).then((r) => r.data),

  delete: (userId: number) =>
    api.delete(`/users/${userId}`).then((r) => r.data),

  activate: (userId: number) =>
    api.post(`/users/${userId}/activate`).then((r) => r.data),

  resetPassword: (userId: number, newPassword: string) =>
    api.post(`/users/${userId}/reset-password`, null, {
      params: { new_password: newPassword },
    }).then((r) => r.data),
};
