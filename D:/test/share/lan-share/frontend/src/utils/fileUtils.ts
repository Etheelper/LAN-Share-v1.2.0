export const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'] as const;

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'] as const;

export const DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt'] as const;

export type FileType = 'video' | 'image' | 'document' | 'other';

export function guessFileType(filename: string): FileType {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext as typeof VIDEO_EXTENSIONS[number])) {
    return 'video';
  }
  if (IMAGE_EXTENSIONS.includes(ext as typeof IMAGE_EXTENSIONS[number])) {
    return 'image';
  }
  if (DOCUMENT_EXTENSIONS.includes(ext as typeof DOCUMENT_EXTENSIONS[number])) {
    return 'document';
  }
  return 'other';
}