import { useState, useCallback, useRef } from 'react';
import { Button, Progress, Select, message, Typography, Space, Collapse, List } from 'antd';
import { CloudUploadOutlined, FolderOpenOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { uploadApi } from '@/services/upload';
import SparkMD5 from 'spark-md5';
import { guessFileType } from '@/utils/fileUtils';

const { Text } = Typography;
const { Panel } = Collapse;

const CHUNK_SIZE = 5 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;

interface UploadTask {
  id: string;
  file: File;
  status: 'pending' | 'hashing' | 'uploading' | 'merging' | 'done' | 'error';
  progress: number;
  error?: string;
}

function computeFileMD5(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunkSize = 2 * 1024 * 1024;
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;

    reader.onload = (e) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
      }
      currentChunk++;
      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    reader.onerror = reject;

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      reader.readAsArrayBuffer(file.slice(start, end));
    }

    loadNext();
  });
}

interface Props {
  onComplete?: () => void;
}

export default function ChunkUploader({ onComplete }: Props) {
  const [visibility, setVisibility] = useState<string>('private');
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const totalProgress = tasks.length > 0
    ? Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length)
    : 0;

  const doneCount = tasks.filter(t => t.status === 'done').length;
  const errorCount = tasks.filter(t => t.status === 'error').length;

  const updateTask = useCallback((id: string, updates: Partial<UploadTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const uploadSingleFile = useCallback(async (task: UploadTask) => {
    const { id, file } = task;
    updateTask(id, { status: 'hashing', progress: 0 });

    try {
      const fileHash = await computeFileMD5(file);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      updateTask(id, { status: 'uploading' });

      const initRes = await uploadApi.init({
        filename: file.name,
        file_size: file.size,
        chunk_size: CHUNK_SIZE,
        total_chunks: totalChunks,
        storage_mode: 'uploaded',
        file_type: guessFileType(file.name),
        visibility,
        file_hash: fileHash,
      });

      if (initRes.upload_id === 'instant') {
        updateTask(id, { status: 'done', progress: 100 });
        message.success(`秒传成功: ${file.name}`);
        return;
      }

      const uploadId = initRes.upload_id;
      const skippedChunks = new Set(initRes.skipped_chunks);
      let uploadedCount = skippedChunks.size;

      const uploadChunk = async (chunkIndex: number) => {
        if (skippedChunks.has(chunkIndex)) return;
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);

        await uploadApi.uploadChunk(uploadId, chunkIndex, chunkBlob);
        uploadedCount++;
        updateTask(id, { progress: Math.round((uploadedCount / totalChunks) * 100) });
      };

      const queue: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        if (!skippedChunks.has(i)) {
          queue.push(i);
        }
      }

      while (queue.length > 0) {
        const batch = queue.splice(0, CONCURRENT_UPLOADS);
        await Promise.all(batch.map((idx) => uploadChunk(idx)));
      }

      updateTask(id, { status: 'merging', progress: 95 });
      await uploadApi.merge(uploadId);

      updateTask(id, { status: 'done', progress: 100 });
      message.success(`上传成功: ${file.name}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      const errorMsg = err.response?.data?.detail || '上传失败';
      updateTask(id, { status: 'error', error: errorMsg });
      message.error(`${file.name}: ${errorMsg}`);
    }
  }, [visibility, updateTask]);

  const uploadFiles = useCallback(async (files: File[]) => {
    const newTasks: UploadTask[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      status: 'pending',
      progress: 0,
    }));

    setTasks(prev => [...prev, ...newTasks]);
    setIsUploading(true);

    for (const task of newTasks) {
      setCurrentTaskId(task.id);
      await uploadSingleFile(task);
    }

    setIsUploading(false);
    setCurrentTaskId(null);
    onComplete?.();
  }, [uploadSingleFile, onComplete]);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement> & { target: HTMLInputElement & { files: FileList | null } }) => {
    const items = e.target.files;
    if (!items || items.length === 0) return;

    const files: File[] = [];
    
    const processEntry = (entry: any) => {
      return new Promise<void>((resolve) => {
        if (entry.isFile) {
          entry.file((file: File) => {
            files.push(file);
            resolve();
          }, () => resolve());
        } else if (entry.isDirectory) {
          const reader = entry.createReader();
          reader.readEntries((entries: any[]) => {
            const promises = entries.map((childEntry: any) => processEntry(childEntry));
            Promise.all(promises).then(() => resolve());
          }, () => resolve());
        } else {
          resolve();
        }
      });
    };

    const processItems = async () => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i] as any;
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          await processEntry(entry);
        } else {
          files.push(item as File);
        }
      }
      if (files.length > 0) {
        uploadFiles(files);
      } else {
        message.error('未找到文件');
      }
    };

    processItems();

    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => t.status !== 'done'));
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Text>可见性：</Text>
          <Select
            value={visibility}
            onChange={setVisibility}
            style={{ width: 120 }}
            disabled={isUploading}
            options={[
              { label: '私有', value: 'private' },
              { label: '公开', value: 'public' },
              { label: '共享', value: 'shared' },
            ]}
          />
        </Space>
      </div>

      {tasks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text strong>
              总进度: {doneCount}/{tasks.length} 已完成
              {errorCount > 0 && <Text type="danger" style={{ marginLeft: 8 }}> ({errorCount} 失败)</Text>}
            </Text>
            {!isUploading && doneCount > 0 && (
              <Button size="small" onClick={clearCompleted}>清除已完成</Button>
            )}
          </div>
          <Progress
            percent={totalProgress}
            status={errorCount > 0 && !isUploading ? 'exception' : 'active'}
          />
        </div>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<FolderOpenOutlined />}
          onClick={() => folderInputRef.current?.click()}
          disabled={isUploading}
        >
          上传文件夹（递归扫描子文件夹）
        </Button>
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: 'true' } as any)}
          style={{ display: 'none' }}
          onChange={handleFolderSelect as any}
        />
      </Space>

      {tasks.length > 0 && (
        <Collapse defaultActiveKey={[]}>
          <Panel header={`上传详情 (${tasks.length} 个文件)`} key="details">
            <List
              size="small"
              dataSource={tasks}
              renderItem={(task) => (
                <List.Item
                  style={{
                    background: task.id === currentTaskId ? '#f0f0f0' : 'transparent',
                    padding: '4px 0',
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {task.status === 'done' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    {task.status === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    {task.status === 'hashing' && <Text type="secondary">🔍</Text>}
                    {task.status === 'uploading' && <Text type="secondary">⬆️</Text>}
                    {task.status === 'merging' && <Text type="secondary">🔄</Text>}
                    {task.status === 'pending' && <Text type="secondary">⏳</Text>}

                    <Text style={{ flex: 1, wordBreak: 'break-all' }} ellipsis>
                      {task.file.name}
                    </Text>

                    <Text type="secondary" style={{ minWidth: 40, textAlign: 'right' }}>
                      {task.progress}%
                    </Text>

                    {task.status === 'error' && (
                      <Text type="danger" style={{ fontSize: 12, marginLeft: 8 }}>
                        {task.error}
                      </Text>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </Panel>
        </Collapse>
      )}

      <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          💡 提示：选择文件夹将递归上传所有文件，大文件自动分片上传（支持秒传和断点续传）
        </Text>
      </div>
    </div>
  );
}
