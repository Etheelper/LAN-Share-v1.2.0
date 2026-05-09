import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Input, Select, Modal, Form, message, Popconfirm, Typography, Breadcrumb, Transfer } from 'antd';
import {
  FolderOutlined, FileOutlined, VideoCameraOutlined, PictureOutlined,
  FileTextOutlined, CloudOutlined, LaptopOutlined, DeleteOutlined,
  EditOutlined, EyeOutlined, DownloadOutlined, PlusOutlined,
  PlayCircleOutlined, SearchOutlined, CloudUploadOutlined, TeamOutlined, FolderOpenOutlined, FolderAddOutlined,
} from '@ant-design/icons';
import { useFileStore } from '@/stores/fileStore';
import { useAuthStore } from '@/stores/authStore';
import { fileApi } from '@/services/files';
import { authApi } from '@/services/auth';
import type { FileResponse, UserResponse, FolderResponse } from '@/types';
import AddFileModal from '@/components/AddFileModal';
import ChunkUploader from '@/components/ChunkUploader';
import { useNavigate } from 'react-router-dom';

const { Search } = Input;

const fileTypeIcon: Record<string, React.ReactNode> = {
  video: <VideoCameraOutlined style={{ fontSize: 20, color: '#1890ff' }} />,
  image: <PictureOutlined style={{ fontSize: 20, color: '#52c41a' }} />,
  document: <FileTextOutlined style={{ fontSize: 20, color: '#faad14' }} />,
  other: <FileOutlined style={{ fontSize: 20, color: '#8c8c8c' }} />,
};

const visibilityColor: Record<string, string> = {
  private: 'default',
  public: 'green',
  shared: 'blue',
};

const visibilityLabel: Record<string, string> = {
  private: '私有',
  public: '公开',
  shared: '共享',
};

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

interface SharedGroup {
  owner_id: number;
  owner_nickname: string;
  files: FileResponse[];
}

export default function FileManager() {
  const {
    files, total, loading, currentFolder, folders, keyword, fileType, page, pageSize,
    fetchFiles, fetchFolders, setCurrentFolder, setKeyword, setFileType, setPage, setPageSize,
  } = useFileStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [renameModal, setRenameModal] = useState<{ visible: boolean; file: FileResponse | null }>({
    visible: false, file: null,
  });
  const [newName, setNewName] = useState('');
  const [viewMode, setViewMode] = useState<'my' | 'shared'>('my');
  const [sharedGroups, setSharedGroups] = useState<SharedGroup[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);
  const [currentSharedGroup, setCurrentSharedGroup] = useState<number | null>(null);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderForm] = Form.useForm();
  const [sharedKeyword, setSharedKeyword] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTargetFile, setShareTargetFile] = useState<FileResponse | null>(null);
  const [shareUsers, setShareUsers] = useState<{id: number; nickname: string}[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    fetchFiles();
    fetchFolders();
    if (viewMode === 'shared') {
      fetchSharedFiles();
    }
  }, [fetchFiles, fetchFolders, viewMode]);

  const fetchSharedFiles = async (keyword?: string) => {
    setSharedLoading(true);
    try {
      const params: { keyword?: string } = {};
      if (keyword) {
        params.keyword = keyword;
      }
      const res = await fileApi.listShared(params);
      setSharedGroups(res.groups);
    } catch {
      message.error('获取共享文件失败');
    } finally {
      setSharedLoading(false);
    }
  };

  const onSearch = (value: string) => {
    setKeyword(value);
    fetchFiles();
  };

  const onCreateFolder = async () => {
    try {
      const values = await newFolderForm.validateFields();
      await fileApi.createFolder({
        name: values.name,
        parent_id: currentFolder ?? undefined,
        visibility: values.visibility || 'private',
      });
      message.success('文件夹创建成功');
      setNewFolderModalOpen(false);
      newFolderForm.resetFields();
      fetchFolders();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || '创建失败');
    }
  };

  const onDelete = async (fileIds: number[]) => {
    try {
      const res = await fileApi.delete(fileIds);
      message.success(res.message || '删除成功');
      setSelectedRowKeys([]);
      if (viewMode === 'shared') {
        fetchSharedFiles();
      } else {
        fetchFiles();
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string }; status?: number } };
      if (err.response?.status === 403) {
        message.error('您无权限删除此文件');
      } else {
        message.error(err.response?.data?.detail || '删除失败');
      }
    }
  };

  const openShareModal = async (file: FileResponse) => {
    setShareTargetFile(file);
    setShareLoading(true);
    setShareModalOpen(true);
    try {
      const users = await authApi.listUsers();
      setShareUsers(users);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setShareLoading(false);
    }
  };

  const onShareFile = async () => {
    if (!shareTargetFile) return;
    setShareLoading(true);
    try {
      for (const userId of selectedUserIds) {
        await fileApi.grantAccess({
          file_id: shareTargetFile.id,
          user_id: userId,
          can_view: true,
          can_download: true,
        });
      }
      message.success('共享设置成功');
      setShareModalOpen(false);
      setShareTargetFile(null);
      setSelectedUserIds([]);
      if (viewMode === 'shared') {
        fetchSharedFiles();
      } else {
        fetchFiles();
      }
    } catch (e: any) {
      message.error(e.response?.data?.detail || '共享设置失败');
    } finally {
      setShareLoading(false);
    }
  };

  const onRename = async () => {
    if (!renameModal.file || !newName.trim()) return;
    try {
      await fileApi.update(renameModal.file.id, { name: newName.trim() });
      message.success('重命名成功');
      setRenameModal({ visible: false, file: null });
      if (viewMode === 'shared') {
        fetchSharedFiles();
      } else {
        fetchFiles();
      }
    } catch {
      message.error('重命名失败');
    }
  };

  const getStreamUrl = (fileId: number) => `/api/stream/file/${fileId}`;
  const getDownloadUrl = (fileId: number) => `/api/stream/download/${fileId}`;

  const getBreadcrumbItems = () => {
    const items: { title: React.ReactNode }[] = [
      { title: <a onClick={() => { setViewMode('my'); setCurrentFolder(null); }}>我的文件</a> }
    ];
    if (viewMode === 'shared') {
      items[0] = { title: <a onClick={() => { setViewMode('shared'); setCurrentSharedGroup(null); }}>共享资源</a> };
      if (currentSharedGroup !== null) {
        const group = sharedGroups.find(g => g.owner_id === currentSharedGroup);
        if (group) {
          items.push({ title: <span>{group.owner_nickname}</span> });
        }
      }
    } else if (currentFolder) {
      const folder = folders.find(f => f.id === currentFolder);
      if (folder) {
        items.push({ title: <span>{folder.name}</span> });
      }
    }
    return items;
  };

  const handleSharedGroupClick = (group: SharedGroup) => {
    setCurrentSharedGroup(group.owner_id);
  };

  const handleBackToSharedList = () => {
    setCurrentSharedGroup(null);
  };

  const renderSharedGroup = (group: SharedGroup) => (
    <div key={group.owner_id} style={{ marginBottom: 16, border: '1px solid #f0f0f0', borderRadius: 8 }}>
      <div
        style={{
          padding: '12px 16px',
          background: '#fafafa',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: '8px 8px 0 0',
        }}
        onClick={() => handleSharedGroupClick(group)}
      >
        <FolderOutlined style={{ fontSize: 20, color: '#1890ff' }} />
        <span style={{ fontWeight: 500 }}>{group.owner_nickname}</span>
        <Tag color="blue">{group.files.length} 个文件</Tag>
      </div>
    </div>
  );

  const renderSharedFileList = () => {
    const group = sharedGroups.find(g => g.owner_id === currentSharedGroup);
    if (!group) return null;

    return (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button icon={<FolderOpenOutlined />} onClick={handleBackToSharedList}>
            返回共享资源
          </Button>
          <span style={{ fontWeight: 500 }}>{group.owner_nickname} 的共享文件</span>
        </div>
        <Table
          rowKey="id"
          columns={getTableColumns()}
          dataSource={group.files}
          loading={sharedLoading}
          pagination={{ pageSize: 30, showTotal: (t: number) => `共 ${t} 个` }}
          size="middle"
        />
      </div>
    );
  };

  const getTableColumns = () => [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => {
        if (record.isFolder || record.file_type === 'folder') {
          return (
            <Space style={{ cursor: 'default' }}>
              <FolderOutlined style={{ fontSize: 18, color: '#faad14' }} />
              <span style={{ fontWeight: 500 }}>{name}</span>
              <Tag color="green">文件夹</Tag>
            </Space>
          );
        }
        return (
          <Space>
            {fileTypeIcon[record.file_type] || fileTypeIcon.other}
            <span style={{ cursor: 'pointer' }} onClick={() => {
              if (record.file_type === 'video') {
                navigate(`/player?id=${record.id}`);
              }
            }}>
              {name}
            </span>
            {record.storage_mode === 'index' && (
              <Tag icon={<LaptopOutlined />} color="orange">索引</Tag>
            )}
            {record.storage_mode === 'uploaded' && (
              <Tag icon={<CloudOutlined />} color="blue">云端</Tag>
            )}
            {!record.is_online && <Tag color="red">离线</Tag>}
          </Space>
        );
      },
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number, record: any) => record.isFolder ? '-' : formatSize(size),
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 100,
      render: (v: string, record: any) => {
        if (record.isFolder) {
          const vis = record.folderData?.visibility;
          return vis ? <Tag color={visibilityColor[vis]}>{visibilityLabel[vis]}</Tag> : '-';
        }
        if (record.file_type === 'folder') {
          return v ? <Tag color={visibilityColor[v]}>{visibilityLabel[v]}</Tag> : '-';
        }
        return <Tag color={visibilityColor[v]}>{visibilityLabel[v]}</Tag>;
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 180,
      render: (d: string, record: any) => {
        if (record.isFolder || record.file_type === 'folder') return d ? new Date(d).toLocaleString('zh-CN') : '-';
        return new Date(d).toLocaleString('zh-CN');
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: unknown, record: any) => {
        if (record.isFolder || record.file_type === 'folder') {
          return '-';
        }
        const canDelete = viewMode === 'my' || user?.role === 'admin' || record.owner_id === user?.id;
        return (
          <Space size="small">
            {record.file_type === 'video' && (
              <Button type="link" size="small" icon={<PlayCircleOutlined />}
                onClick={() => navigate(`/player?id=${record.id}`)}>
                播放
              </Button>
            )}
            {record.file_type === 'image' && (
              <Button type="link" size="small" icon={<EyeOutlined />}
                onClick={() => window.open(getStreamUrl(record.id), '_blank')}>
                预览
              </Button>
            )}
            <Button type="link" size="small" icon={<DownloadOutlined />}
              onClick={() => {
                const a = document.createElement('a');
                a.href = getDownloadUrl(record.id);
                a.download = record.name;
                const token = localStorage.getItem('token');
                fetch(getDownloadUrl(record.id), {
                  headers: { Authorization: `Bearer ${token}` },
                }).then(r => r.blob()).then(blob => {
                  const url = URL.createObjectURL(blob);
                  a.href = url;
                  a.click();
                  URL.revokeObjectURL(url);
                });
              }}>
              下载
            </Button>
            {viewMode === 'my' && (
              <Button type="link" size="small" icon={<TeamOutlined />}
                onClick={() => openShareModal(record)}>
                共享
              </Button>
            )}
            {canDelete && (
              <Popconfirm
                title="确定删除此文件？"
                onConfirm={() => {
                  fileApi.delete([record.id]).then(() => {
                    message.success('文件已删除');
                    if (viewMode === 'shared') {
                      fetchSharedFiles();
                    } else {
                      fetchFiles();
                    }
                  }).catch((e: any) => {
                    message.error(e.response?.data?.detail || '删除失败');
                  });
                }}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  const handleDeleteFolder = async (folderId: number) => {
    try {
      await fileApi.deleteFolder(folderId);
      message.success('文件夹已删除');
      fetchFolders();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const columns = getTableColumns();

  const currentFiles = viewMode === 'shared' && currentSharedGroup !== null
    ? sharedGroups.find(g => g.owner_id === currentSharedGroup)?.files || []
    : files;

  const currentFolders = viewMode === 'my' && currentFolder === null
    ? folders.filter(f => f.parent_id === null)
    : folders.filter(f => f.parent_id === currentFolder);

  const combinedData = [
    ...currentFolders.map((folder): any => ({
      key: `folder-${folder.id}`,
      isFolder: true,
      id: folder.id,
      name: folder.name,
      folderData: folder,
    })),
    ...currentFiles.map((file): any => ({
      key: `file-${file.id}`,
      isFolder: false,
      ...file,
    })),
  ];

  const handleFolderClick = (folder: FolderResponse) => {
    setCurrentFolder(folder.id);
  };

  const handleFolderBack = () => {
    setCurrentFolder(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Breadcrumb items={getBreadcrumbItems()} />
        <Space>
          <Button.Group>
            <Button
              type={viewMode === 'my' ? 'primary' : 'default'}
              icon={<FolderOutlined />}
              onClick={() => { setViewMode('my'); setCurrentSharedGroup(null); }}
            >
              我的文件
            </Button>
            <Button
              type={viewMode === 'shared' ? 'primary' : 'default'}
              icon={<TeamOutlined />}
              onClick={() => { setViewMode('shared'); setCurrentSharedGroup(null); }}
            >
              共享资源
            </Button>
          </Button.Group>
          <Search
            placeholder="搜索文件"
            allowClear
            onSearch={onSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          {viewMode === 'my' && (
            <Select
              placeholder="文件类型"
              allowClear
              style={{ width: 120 }}
              value={fileType}
              onChange={(v) => setFileType(v)}
              options={[
                { label: '视频', value: 'video' },
                { label: '图片', value: 'image' },
                { label: '文档', value: 'document' },
                { label: '其他', value: 'other' },
              ]}
            />
          )}
        </Space>
      </div>

      {viewMode === 'shared' && currentSharedGroup === null ? (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>共享资源</Typography.Title>
            <Typography.Text type="secondary">
              所有用户共享的文件，按上传者分组显示
            </Typography.Text>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="搜索用户昵称或用户名"
              allowClear
              value={sharedKeyword}
              onChange={(e) => setSharedKeyword(e.target.value)}
              onSearch={(value) => fetchSharedFiles(value)}
              style={{ width: 300 }}
              prefix={<SearchOutlined />}
            />
          </div>
          {sharedLoading ? (
            <Typography.Text>加载中...</Typography.Text>
          ) : sharedGroups.length === 0 ? (
            <Typography.Text type="secondary">
              {sharedKeyword ? '未找到匹配的用户' : '暂无其他用户'}
            </Typography.Text>
          ) : (
            sharedGroups.map(renderSharedGroup)
          )}
        </div>
      ) : viewMode === 'shared' && currentSharedGroup !== null ? (
        renderSharedFileList()
      ) : (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Space>
              {viewMode === 'my' && (
                <>
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
                    添加文件（索引模式）
                  </Button>
                  <Button icon={<FolderAddOutlined />} onClick={() => setNewFolderModalOpen(true)}>
                    新建文件夹
                  </Button>
                  <Button icon={<CloudUploadOutlined />} onClick={() => setUploadModalOpen(true)}>
                    上传文件夹（上传模式）
                  </Button>
                </>
              )}
              {selectedRowKeys.length > 0 && viewMode === 'my' && (
                <Popconfirm title={`确定删除 ${selectedRowKeys.length} 个文件？`} onConfirm={() => onDelete(selectedRowKeys)}>
                  <Button danger icon={<DeleteOutlined />}>批量删除</Button>
                </Popconfirm>
              )}
            </Space>
            <Typography.Text type="secondary">共 {viewMode === 'shared' ? currentFiles.length : total} 个文件</Typography.Text>
          </div>

          <Table
            rowKey="key"
            columns={columns}
            dataSource={combinedData}
            loading={viewMode === 'shared' ? sharedLoading : loading}
            rowSelection={viewMode === 'my' ? { selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys as number[]) } : undefined}
            pagination={viewMode === 'my' ? {
              current: page, pageSize, total,
              showSizeChanger: true, showTotal: (t: number) => `共 ${t} 个`,
              onChange: (p, ps) => { setPage(p); setPageSize(ps); },
            } : false}
            size="middle"
            onRow={(record) => ({
              onDoubleClick: () => {
                if (record.isFolder || record.file_type === 'folder') {
                  handleFolderClick(record.folderData || record);
                }
              },
              style: { cursor: (record.isFolder || record.file_type === 'folder') ? 'pointer' : 'default' },
            })}
          />
        </>
      )}

      <AddFileModal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); fetchFiles(); }}
      />

      <Modal
        title="上传文件夹"
        open={uploadModalOpen}
        onCancel={() => { setUploadModalOpen(false); fetchFiles(); }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <ChunkUploader
          onComplete={() => { setUploadModalOpen(false); fetchFiles(); }}
        />
      </Modal>

      <Modal
        title="新建文件夹"
        open={newFolderModalOpen}
        onOk={onCreateFolder}
        onCancel={() => { setNewFolderModalOpen(false); newFolderForm.resetFields(); }}
      >
        <Form form={newFolderForm} layout="vertical">
          <Form.Item name="name" label="文件夹名称" rules={[{ required: true, message: '请输入文件夹名称' }]}>
            <Input placeholder="请输入文件夹名称" />
          </Form.Item>
          <Form.Item name="visibility" label="可见性" initialValue="private">
            <Select options={[
              { label: '私有', value: 'private' },
              { label: '公开', value: 'public' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="重命名"
        open={renameModal.visible}
        onOk={onRename}
        onCancel={() => setRenameModal({ visible: false, file: null })}
      >
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
      </Modal>

      <Modal
        title={`共享文件: ${shareTargetFile?.name || ''}`}
        open={shareModalOpen}
        onOk={onShareFile}
        onCancel={() => { setShareModalOpen(false); setShareTargetFile(null); setSelectedUserIds([]); }}
        confirmLoading={shareLoading}
      >
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: '#666' }}>选择可以查看此文件的用户：</p>
          <Transfer
            dataSource={shareUsers.map(u => ({ key: String(u.id), title: u.nickname }))}
            targetKeys={selectedUserIds.map(String)}
            onChange={(keys) => setSelectedUserIds(keys.map(Number))}
            render={(item) => item.title || ''}
            titles={['可选用户', '已选择']}
            listStyle={{ width: 300, height: 300 }}
          />
        </div>
      </Modal>
    </div>
  );
}