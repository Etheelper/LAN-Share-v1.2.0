import { useState, useRef, useEffect } from 'react';
import { Modal, Form, Input, Select, Radio, Button, Space, message, Tag, Alert } from 'antd';
import { FolderOpenOutlined, HistoryOutlined } from '@ant-design/icons';
import { fileApi } from '@/services/files';
import type { FileAddRequest } from '@/types';
import { guessFileType } from '@/utils/fileUtils';

const fileTypeOptions = [
  { label: '视频', value: 'video' },
  { label: '图片', value: 'image' },
  { label: '文档', value: 'document' },
  { label: '其他', value: 'other' },
];

const STORAGE_KEY = 'lan-share-recent-paths';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddFileModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const [storageMode, setStorageMode] = useState<string>('index');
  const [loading, setLoading] = useState(false);
  const [localPath, setLocalPath] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRecentPaths(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const saveRecentPath = (path: string) => {
    const updated = [path, ...recentPaths.filter(p => p !== path)].slice(0, 5);
    setRecentPaths(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const onSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const finalPath = localPath || values.local_path;
      const data: FileAddRequest = {
        name: fileName || values.name,
        file_type: values.file_type || guessFileType(fileName || values.name),
        size: values.size || 0,
        storage_mode: values.storage_mode,
        local_path: values.storage_mode === 'index' ? finalPath : undefined,
        visibility: values.visibility || 'private',
        folder_id: values.folder_id,
      };

      if (values.storage_mode === 'index') {
        saveRecentPath(finalPath);
      }

      await fileApi.add(data);
      message.success('文件添加成功');
      resetForm();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      if (err.response?.data?.detail) {
        message.error(err.response.data.detail);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLocalPath('');
    setFileName('');
    form.resetFields();
  };

  const handleBrowse = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          excludeAcceptAllOption: false,
          multiple: false,
        });
        const file = await fileHandle.getFile();
        setFileName(file.name);
        
        if (recentPaths.length > 0) {
          setLocalPath(`${recentPaths[0]}\\${file.name}`);
        } else {
          setLocalPath(file.name);
        }
        
        form.setFieldsValue({ name: file.name });
        message.success(`已选择文件: ${file.name}，请确认或修改路径`);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('File picker error:', e);
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      
      if (recentPaths.length > 0) {
        setLocalPath(`${recentPaths[0]}\\${file.name}`);
      } else {
        setLocalPath(file.name);
      }
      
      form.setFieldsValue({ name: file.name });
      message.success(`已选择文件: ${file.name}，请确认或修改路径`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuickPath = (basePath: string) => {
    if (fileName) {
      setLocalPath(`${basePath}\\${fileName}`);
    } else {
      setLocalPath(basePath + '\\');
    }
  };

  return (
    <Modal
      title="添加文件"
      open={open}
      onOk={onSubmit}
      onCancel={() => { resetForm(); onClose(); }}
      confirmLoading={loading}
      destroyOnClose
      width={600}
    >
      <Form form={form} layout="vertical" initialValues={{ storage_mode: 'index', visibility: 'private' }}>
        <Form.Item name="storage_mode" label="存储模式" rules={[{ required: true }]}>
          <Radio.Group onChange={(e) => setStorageMode(e.target.value)}>
            <Radio value="index">索引模式（引用本地文件）</Radio>
            <Radio value="uploaded">上传模式（上传到服务器）</Radio>
          </Radio.Group>
        </Form.Item>

        {storageMode === 'index' && (
          <Alert
            type="warning"
            showIcon
            message="索引模式注意事项"
            description={
              <div style={{ fontSize: 12 }}>
                <p style={{ margin: '4px 0' }}>⚠️ <b>重要</b>：索引文件需要运行 Backend 服务器的电脑保持开机状态。</p>
                <p style={{ margin: '4px 0' }}>📌 当 Backend 服务器（运行 python run.py 的电脑）<b>关机或未运行服务</b>时，索引文件将<b>无法播放</b>。</p>
                <p style={{ margin: '4px 0' }}>💡 建议：将 Backend 服务设置为<b>开机自动启动</b>，以确保稳定访问。</p>
              </div>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {storageMode === 'index' && (
          <>
            <Form.Item
              name="local_path"
              label="本地文件路径"
              rules={[{ required: true, message: '请选择或输入本地文件路径' }]}
              tooltip="点击浏览按钮选择文件，然后从下方快捷路径中选择或手动输入完整路径"
            >
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="如：D:\Movies\电影.mp4"
                  style={{ flex: 1 }}
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                />
                <Button icon={<FolderOpenOutlined />} onClick={handleBrowse}>
                  浏览
                </Button>
              </Space.Compact>
            </Form.Item>
            
            {recentPaths.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                  <HistoryOutlined /> 常用路径（点击快速填充）：
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {recentPaths.map((p, i) => (
                    <Tag 
                      key={i} 
                      color="blue" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleQuickPath(p)}
                    >
                      {p.length > 30 ? p.slice(0, 28) + '...' : p}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <p style={{ color: '#52c41a', fontSize: 12, marginTop: 4 }}>
              💡 使用技巧：先选文件 → 再点上方常用路径自动补全 → 或直接手动输入完整路径
            </p>
          </>
        )}

        <Form.Item name="name" label="文件名" rules={[{ required: true, message: '请输入文件名' }]}>
          <Input placeholder="如：电影.mp4" />
        </Form.Item>

        <Form.Item name="file_type" label="文件类型">
          <Select placeholder="自动检测" allowClear options={fileTypeOptions} />
        </Form.Item>

        {storageMode === 'uploaded' && (
          <Form.Item name="size" label="文件大小（字节）">
            <Input type="number" placeholder="0" />
          </Form.Item>
        )}

        <Form.Item name="visibility" label="可见性">
          <Select options={[
            { label: '私有', value: 'private' },
            { label: '公开', value: 'public' },
            { label: '共享', value: 'shared' },
          ]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
