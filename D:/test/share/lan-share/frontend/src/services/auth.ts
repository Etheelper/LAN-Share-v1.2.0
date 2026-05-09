import api from './api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UserResponse,
} from '@/types';

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    api.post<UserResponse>('/auth/register', data).then((r) => r.data),

  getMe: () =>
    api.get<UserResponse>('/auth/me').then((r) => r.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    }).then((r) => r.data),

  listUsers: () =>
    api.get<{id: number; username: string; nickname: string}[]>('/auth/users').then((r) => r.data),
};
