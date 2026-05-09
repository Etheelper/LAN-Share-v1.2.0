import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, theme } from 'antd';
import {
  FolderOutlined,
  CloudUploadOutlined,
  VideoCameraOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: '文件管理' },
  { key: '/upload', icon: <CloudUploadOutlined />, label: '上传中心' },
  { key: '/player', icon: <VideoCameraOutlined />, label: '视频播放' },
];

export default function MainLayout() {
  const { user, logout, init } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    }
  }, [navigate]);

  if (!user) return null;

  const adminMenu = user.role === 'admin' ? [
    { type: 'divider' as const },
    { key: '/admin', icon: <SettingOutlined />, label: '管理后台' },
  ] : [];

  const userDropdown = [
    { key: 'profile', icon: <UserOutlined />, label: `${user.nickname || user.username}` },
    { key: 'storage', icon: <FolderOutlined />, label: `存储: ${(user.storage_used / 1073741824).toFixed(1)}GB / ${(user.storage_quota / 1073741824).toFixed(0)}GB` },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
  ];

  const onMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const onUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={220} style={{ background: colorBgContainer }} breakpoint="lg" collapsedWidth={80}>
        <div style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <h2 style={{ margin: 0, color: '#1890ff', fontSize: 20 }}>LAN Share</h2>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[...menuItems, ...adminMenu]}
          onClick={onMenuClick}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px', background: colorBgContainer,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <Dropdown menu={{ items: userDropdown, onClick: onUserMenuClick }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user.nickname || user.username}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
