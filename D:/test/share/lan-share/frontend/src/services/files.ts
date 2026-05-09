import api from './api';
import type {
  FileListResponse,
  FileResponse,
  FileAddRequest,
  FileUpdateRequest,
  FolderResponse,
  FolderCreateRequest,
  FileAccessGrant,
  SharedListResponse,
} from '@/types';

export const fileApi = {
  list: (params?: {
    folder_id?: number;
    file_type?: string;
    visibility?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) => api.get<FileListResponse>('/files/', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<FileResponse>(`/files/${id}`).then((r) => r.data),

  add: (data: FileAddRequest) =>
    api.post<FileResponse>('/files/', data).then((r) => r.data),

  update: (id: number, data: FileUpdateRequest) =>
    api.patch<FileResponse>(`/files/${id}`, data).then((r) => r.data),

  delete: (fileIds: number[]) =>
    api.delete('/files/', { data: { file_ids: fileIds } }).then((r) => r.data),

  getFolders: () =>
    api.get<FolderResponse[]>('/files/folders/all').then((r) => r.data),

  createFolder: (data: FolderCreateRequest) =>
    api.post<FolderResponse>('/files/folders', data).then((r) => r.data),

  deleteFolder: (id: number) =>
    api.delete(`/files/folders/${id}`).then((r) => r.data),

  grantAccess: (data: FileAccessGrant) =>
    api.post('/files/access', data).then((r) => r.data),

  revokeAccess: (fileId: number, userId: number) =>
    api.delete(`/files/access/${fileId}/${userId}`).then((r) => r.data),

  adminListAll: (params?: {
    page?: number;
    page_size?: number;
    keyword?: string;
    storage_mode?: string;
  }) =>
    api.get<FileListResponse>('/files/admin/all', { params }).then((r) => r.data),

  getDownloads: (params?: { page?: number; page_size?: number }) =>
    api.get('/files/downloads', { params }).then((r) => r.data),

  listShared: (params?: { keyword?: string }) =>
    api.get<SharedListResponse>('/files/shared', { params }).then((r) => r.data),
};
