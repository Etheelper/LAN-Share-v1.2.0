export interface UserResponse {
  id: number;
  username: string;
  nickname: string | null;
  role: string;
  storage_quota: number;
  storage_used: number;
  status: string;
  created_at: string;
  last_login: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname?: string;
}

export interface FileResponse {
  id: number;
  name: string;
  file_type: string;
  mime_type: string | null;
  size: number;
  storage_mode: string;
  local_path: string | null;
  server_path: string | null;
  visibility: string;
  owner_id: number;
  folder_id: number | null;
  created_at: string;
  updated_at: string;
  is_online: boolean;
}

export interface FileListResponse {
  total: number;
  files: FileResponse[];
}

export interface FileAddRequest {
  name: string;
  file_type: string;
  mime_type?: string;
  size: number;
  storage_mode: string;
  local_path?: string;
  server_path?: string;
  file_hash?: string;
  visibility: string;
  folder_id?: number;
}

export interface FileUpdateRequest {
  name?: string;
  visibility?: string;
  folder_id?: number;
}

export interface FolderResponse {
  id: number;
  name: string;
  parent_id: number | null;
  owner_id: number;
  visibility: string;
  created_at: string;
}

export interface FolderCreateRequest {
  name: string;
  parent_id?: number;
  visibility?: string;
}

export interface FileAccessGrant {
  file_id: number;
  user_id: number;
  can_view: boolean;
  can_download: boolean;
}

export interface ChunkUploadInitRequest {
  filename: string;
  file_size: number;
  chunk_size: number;
  total_chunks: number;
  storage_mode: string;
  file_type: string;
  visibility: string;
  folder_id?: number;
  file_hash?: string;
}

export interface ChunkUploadInitResponse {
  file_id: number;
  upload_id: string;
  total_chunks: number;
  skipped_chunks: number[];
  server_path: string | null;
}

export interface ChunkMergeRequest {
  upload_id: string;
}

export interface ChunkMergeResponse {
  file_id: number;
  server_path: string;
  skipped: boolean;
}

export interface UserListResponse {
  total: number;
  users: UserResponse[];
}

export interface UserUpdateRequest {
  nickname?: string;
  password?: string;
  status?: string;
  storage_quota?: number;
}

export interface SharedGroup {
  owner_id: number;
  owner_nickname: string;
  files: FileResponse[];
}

export interface SharedListResponse {
  groups: SharedGroup[];
}

export interface ElectronAPI {
  selectFile: () => Promise<{ filePath: string; fileName: string } | null>;
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
