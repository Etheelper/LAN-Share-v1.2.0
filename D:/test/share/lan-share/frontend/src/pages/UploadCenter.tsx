import { useState } from 'react';
import { Upload, message, Progress, Select, Typography } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { uploadApi } from '@/services/upload';
import { guessFileType } from '@/utils/fileUtils';

const { Dragger } = Upload;
const { Text } = Typography;

const CHUNK_SIZE = 5 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;

export default function UploadCenter() {
  const [visibility, setVisibility] = useState<string>('private');
  const [uploads, setUploads] = useState<{
    id: string;
    name: string;
    progress: number;
    status: string;
  }[]>([]);

  const handleUpload = async (file: File) => {
    const uploadId = `upload-${Date.now()}`;
    const newUpload = { id: uploadId, name: file.name, progress: 0, status: '上传中' };
    setUploads(prev => [...prev, newUpload]);

    try {
      if (file.size < 100 * 1024 * 1024) {
        await uploadApi.simpleUpload(file, visibility, undefined, (p) => {
          setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: p } : u));
        });
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: '完成' } : u));
        message.success(`${file.name} 上传成功`);
        return;
      }

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      const initRes = await uploadApi.init({
        filename: file.name,
        file_size: file.size,
        chunk_size: CHUNK_SIZE,
        total_chunks: totalChunks,
        storage_mode: 'uploaded',
        file_type: guessFileType(file.name),
        visibility,
      });

      if (initRes.upload_id === 'instant') {
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: '秒传完成' } : u));
        message.success(`${file.name} 秒传成功！`);
        return;
      }

      let uploadedCount = 0;
      const uploadChunk = async (chunkIndex: number) => {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunkBlob = file.slice(start, end);
        await uploadApi.uploadChunk(initRes.upload_id, chunkIndex, chunkBlob);
        uploadedCount++;
        const p = Math.round((uploadedCount / totalChunks) * 100);
        setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: p } : u));
      };

      const queue: number[] = [];
      for (let i = 0; i < totalChunks; i++) queue.push(i);

      while (queue.length > 0) {
        const batch = queue.splice(0, CONCURRENT_UPLOADS);
        await Promise.all(batch.map(idx => uploadChunk(idx)));
      }

      await uploadApi.merge(initRes.upload_id);
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, progress: 100, status: '完成' } : u));
      message.success(`${file.name} 上传成功`);
    } catch {
      setUploads(prev => prev.map(u => u.id === uploadId ? { ...u, status: '失败' } : u));
      message.error(`${file.name} 上传失败`);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>可见性：</Text>
        <Select
          value={visibility}
          onChange={setVisibility}
          style={{ width: 120 }}
          options={[
            { label: '私有', value: 'private' },
            { label: '公开', value: 'public' },
            { label: '共享', value: 'shared' },
          ]}
        />
      </div>

      <Dragger
        multiple
        showUploadList={false}
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
        <p className="ant-upload-hint">支持多文件上传，大文件自动分片</p>
      </Dragger>

      {uploads.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <Text strong>上传进度</Text>
          {uploads.map(u => (
            <div key={u.id} style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{u.name}</Text>
                <Text type={u.status === '完成' ? 'success' : u.status === '失败' ? 'danger' : undefined}>
                  {u.status}
                </Text>
              </div>
              <Progress percent={u.progress} status={u.status === '失败' ? 'exception' : u.status === '完成' ? 'success' : 'active'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
