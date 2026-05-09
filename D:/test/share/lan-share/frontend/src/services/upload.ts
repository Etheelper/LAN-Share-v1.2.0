import api from './api';
import type {
  ChunkUploadInitRequest,
  ChunkUploadInitResponse,
  ChunkMergeResponse,
} from '@/types';

export const uploadApi = {
  init: (data: ChunkUploadInitRequest) =>
    api.post<ChunkUploadInitResponse>('/upload/init', data).then((r) => r.data),

  uploadChunk: (
    uploadId: string,
    chunkIndex: number,
    chunkData: Blob,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('chunk_data', chunkData);
    return api
      .post(`/upload/chunk?upload_id=${uploadId}&chunk_index=${chunkIndex}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  getProgress: (uploadId: string) =>
    api.get(`/upload/progress/${uploadId}`).then((r) => r.data),

  merge: (uploadId: string) =>
    api.post<ChunkMergeResponse>('/upload/merge', { upload_id: uploadId }).then((r) => r.data),

  cancel: (uploadId: string) =>
    api.post(`/upload/cancel/${uploadId}`).then((r) => r.data),

  simpleUpload: (
    file: File,
    visibility: string = 'private',
    folderId?: number,
    onProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('file_data', file);
    const params: Record<string, string> = { visibility };
    if (folderId !== undefined) params.folder_id = String(folderId);
    return api
      .post('/upload/simple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params,
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },
};
