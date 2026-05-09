import { create } from 'zustand';
import type { FileResponse, FolderResponse } from '@/types';
import { fileApi } from '@/services/files';

interface FileState {
  files: FileResponse[];
  total: number;
  loading: boolean;
  currentFolder: number | null;
  folders: FolderResponse[];
  keyword: string;
  fileType: string | undefined;
  page: number;
  pageSize: number;
  fetchFiles: () => Promise<void>;
  fetchFolders: () => Promise<void>;
  setCurrentFolder: (folderId: number | null) => void;
  setKeyword: (keyword: string) => void;
  setFileType: (fileType: string | undefined) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  total: 0,
  loading: false,
  currentFolder: null,
  folders: [],
  keyword: '',
  fileType: undefined,
  page: 1,
  pageSize: 30,

  fetchFiles: async () => {
    set({ loading: true });
    try {
      const { currentFolder, keyword, fileType, page, pageSize } = get();
      const res = await fileApi.list({
        folder_id: currentFolder ?? undefined,
        keyword: keyword || undefined,
        file_type: fileType,
        page,
        page_size: pageSize,
      });
      set({ files: res.files, total: res.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchFolders: async () => {
    try {
      const folders = await fileApi.getFolders();
      set({ folders });
    } catch {
      // ignore
    }
  },

  setCurrentFolder: (folderId) => {
    set({ currentFolder: folderId, page: 1 });
    get().fetchFiles();
  },

  setKeyword: (keyword) => {
    set({ keyword, page: 1 });
  },

  setFileType: (fileType) => {
    set({ fileType, page: 1 });
    get().fetchFiles();
  },

  setPage: (page) => {
    set({ page });
    get().fetchFiles();
  },

  setPageSize: (pageSize) => {
    set({ pageSize, page: 1 });
    get().fetchFiles();
  },
}));
