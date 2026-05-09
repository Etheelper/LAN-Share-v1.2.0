import { useEffect, useState } from 'react';
import { Table, Button, Space, Tag, Modal, Form, Input, Select, InputNumber, message, Tabs, Typography, Progress } from 'antd';
import { UserOutlined, FileOutlined, CheckCircleOutlined, StopOutlined, KeyOutlined, EditOutlined } from '@ant-design/icons';
import { userApi } from '@/services/users';
import { fileApi } from '@/services/files';
import type { UserResponse } from '@/types';

const { Title } = Typography;

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userLoading, setUserLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [resetModal, setResetModal] = useState<{ visible: boolean; userId: number | null }>({ visible: false, userId: null });
  const [quotaModal, setQuotaModal] = useState<{ visible: boolean; user: UserResponse | null }>({ visible: false, user: null });
  const [createForm] = Form.useForm();
  const [quotaForm] = Form.useForm();

  const [fileTotal, setFileTotal] = useState(0);
  const [filePage, setFilePage] = useState(1);
  const [files, setFiles] = useState<unknown[]>([]);
  const [fileLoading, setFileLoading] = useState(false);

  const fetchUsers = async (page = userPage) => {
    setUserLoading(true);
    try {
      const res = await userApi.list({ page, page_size: 20 });
      setUsers(res.users);
      setUserTotal(res.total);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setUserLoading(false);
    }
  };

  const fetchFiles = async (page = filePage) => {
    setFileLoading(true);
    try {
      const res = await fileApi.adminListAll({ page, page_size: 20 });
      setFiles(res.files);
      setFileTotal(res.total);
    } catch {
      message.error('获取文件列表失败');
    } finally {
      setFileLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchFiles();
  }, []);

  const onCreateUser = async () => {
    try {
      const values = await createForm.validateFields();
      await userApi.create({
        username: values.username,
        password: values.password,
        nickname: values.nickname,
        role: values.role || 'user',
        auto_active: true,
      });
      message.success('用户创建成功');
      setCreateModalOpen(false);
      createForm.resetFields();
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      if (err.response?.data?.detail) message.error(err.response.data.detail);
    }
  };

  const onToggleStatus = async (userId: number, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await userApi.update(userId, { status: 'frozen' });
        message.success('已冻结');
      } else {
        await userApi.update(userId, { status: 'active' });
        message.success('已激活');
      }
      fetchUsers();
    } catch {
      message.error('操作失败');
    }
  };

  const onResetPassword = async (newPassword: string) => {
    if (!resetModal.userId) return;
    try {
      await userApi.resetPassword(resetModal.userId, newPassword);
      message.success('密码已重置');
      setResetModal({ visible: false, userId: null });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || '重置失败');
    }
  };

  const onUpdateQuota = async () => {
    if (!quotaModal.user) return;
    try {
      const values = await quotaForm.validateFields();
      const quotaInMB = values.quota;
      const quotaInBytes = quotaInMB * 1024 * 1024;
      await userApi.update(quotaModal.user.id, { storage_quota: quotaInBytes });
      message.success('存储配额已更新');
      setQuotaModal({ visible: false, user: null });
      quotaForm.resetFields();
      fetchUsers();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      message.error(err.response?.data?.detail || '更新失败');
    }
  };

  const openQuotaModal = (user: UserResponse) => {
    const quotaInMB = Math.round(user.storage_quota / (1024 * 1024));
    quotaForm.setFieldsValue({ quota: quotaInMB });
    setQuotaModal({ visible: true, user });
  };

  const userColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 80,
      render: (role: string) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role === 'admin' ? '管理员' : '用户'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: string) => {
        const map: Record<string, { color: string; label: string }> = {
          active: { color: 'green', label: '正常' },
          frozen: { color: 'red', label: '冻结' },
          pending: { color: 'orange', label: '待审核' },
        };
        const s = map[status] || { color: 'default', label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '存储使用', key: 'storage', width: 200,
      render: (_: unknown, record: UserResponse) => {
        const percent = record.storage_quota > 0 ? Math.round((record.storage_used / record.storage_quota) * 100) : 0;
        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Progress percent={percent} size="small" format={() => `${formatSize(record.storage_used)} / ${formatSize(record.storage_quota)}`} />
          </Space>
        );
      },
    },
    {
      title: '操作', key: 'action', width: 250,
      render: (_: unknown, record: UserResponse) => (
        <Space size="small">
          {record.status === 'active' ? (
            <Button size="small" danger icon={<StopOutlined />}
              onClick={() => onToggleStatus(record.id, record.status)}>冻结</Button>
          ) : (
            <Button size="small" type="primary" icon={<CheckCircleOutlined />}
              onClick={() => onToggleStatus(record.id, record.status)}>激活</Button>
          )}
          <Button size="small" icon={<KeyOutlined />}
            onClick={() => setResetModal({ visible: true, userId: record.id })}>重置密码</Button>
          <Button size="small" type="link" icon={<EditOutlined />}
            onClick={() => openQuotaModal(record)}>配额</Button>
        </Space>
      ),
    },
  ];

  const fileColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '文件名', dataIndex: 'name', key: 'name' },
    {
      title: '类型', dataIndex: 'file_type', key: 'file_type', width: 80,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: '大小', dataIndex: 'size', key: 'size', width: 100,
      render: (s: number) => formatSize(s),
    },
    {
      title: '模式', dataIndex: 'storage_mode', key: 'storage_mode', width: 80,
      render: (m: string) => <Tag color={m === 'uploaded' ? 'blue' : 'orange'}>{m === 'uploaded' ? '云端' : '索引'}</Tag>,
    },
    {
      title: '可见性', dataIndex: 'visibility', key: 'visibility', width: 80,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    { title: '所有者ID', dataIndex: 'owner_id', key: 'owner_id', width: 80 },
  ];

  return (
    <div>
      <Tabs items={[
        {
          key: 'users',
          label: '用户管理',
          icon: <UserOutlined />,
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button type="primary" onClick={() => setCreateModalOpen(true)}>创建用户</Button>
              </div>
              <Table
                rowKey="id"
                columns={userColumns}
                dataSource={users}
                loading={userLoading}
                pagination={{
                  current: userPage, total: userTotal, pageSize: 20,
                  onChange: (p) => { setUserPage(p); fetchUsers(p); },
                }}
                size="middle"
              />
            </div>
          ),
        },
        {
          key: 'files',
          label: '文件总览',
          icon: <FileOutlined />,
          children: (
            <Table
              rowKey="id"
              columns={fileColumns}
              dataSource={files}
              loading={fileLoading}
              pagination={{
                current: filePage, total: fileTotal, pageSize: 20,
                onChange: (p) => { setFilePage(p); fetchFiles(p); },
              }}
              size="middle"
            />
          ),
        },
      ]} />

      <Modal title="创建用户" open={createModalOpen} onOk={onCreateUser} onCancel={() => setCreateModalOpen(false)} destroyOnClose>
        <Form form={createForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true }, { min: 3 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true }, { min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="nickname" label="昵称">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="user">
            <Select options={[
              { label: '普通用户', value: 'user' },
              { label: '管理员', value: 'admin' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="重置密码" open={resetModal.visible} onOk={() => {
        const input = document.querySelector('#reset-pwd-input') as HTMLInputElement;
        if (input?.value && input.value.length >= 6) {
          onResetPassword(input.value);
        } else {
          message.error('密码至少6位');
        }
      }} onCancel={() => setResetModal({ visible: false, userId: null })}>
        <Input id="reset-pwd-input" type="password" placeholder="输入新密码（至少6位）" />
      </Modal>

      <Modal title="设置存储配额" open={quotaModal.visible} onOk={onUpdateQuota} onCancel={() => setQuotaModal({ visible: false, user: null })}>
        <p style={{ marginBottom: 16 }}>
          当前用户：<strong>{quotaModal.user?.nickname || quotaModal.user?.username}</strong>
          <br />
          当前配额：<strong>{quotaModal.user ? formatSize(quotaModal.user.storage_quota) : ''}</strong>
        </p>
        <Form form={quotaForm} layout="vertical">
          <Form.Item name="quota" label="存储配额（MB）" rules={[{ required: true, message: '请输入配额' }]}>
            <InputNumber min={100} max={1000000} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}