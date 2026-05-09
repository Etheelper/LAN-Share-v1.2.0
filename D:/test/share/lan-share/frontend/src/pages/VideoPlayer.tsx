import { useEffect, useRef, useState } from 'react';
import { Spin, Typography, Button, message, Space } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/services/api';

const { Title } = Typography;

interface StreamInfo {
  file_id: number;
  name: string;
  size: number;
  content_type: string;
  storage_mode: string;
  is_online: boolean;
  is_video: boolean;
  visibility: string;
  server_path: string | null;
  local_path: string | null;
}

export default function VideoPlayer() {
  const [searchParams] = useSearchParams();
  const fileId = searchParams.get('id');
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>('');

  useEffect(() => {
    if (!fileId) {
      setError('未指定文件');
      setLoading(false);
      return;
    }

    const fetchInfo = async () => {
      try {
        const res = await api.get(`/stream/info/${fileId}`);
        const info = res.data as StreamInfo;

        if (!info.is_online) {
          setError('文件不在线（源电脑未开机或文件已移动）');
          setLoading(false);
          return;
        }

        setStreamInfo(info);

        const baseUrl = window.location.origin;
        const url = `${baseUrl}/api/stream/file/${fileId}`;
        setStreamUrl(url);
        setVideoUrl(`/api/stream/file/${fileId}`);
      } catch (e: any) {
        const detail = e.response?.data?.detail || '无法获取文件信息';
        setError(detail);
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [fileId]);

  useEffect(() => {
    if (videoRef.current && error) {
      videoRef.current.pause();
    }
  }, [error]);

  const copyStreamUrl = () => {
    navigator.clipboard.writeText(streamUrl).then(() => {
      message.success('播放地址已复制，可粘贴到 VLC 等播放器播放');
    }).catch(() => {
      message.error('复制失败，请手动复制地址栏 URL');
    });
  };

  const openInNewTab = () => {
    window.open(streamUrl, '_blank');
  };

  const getVideoType = () => {
    if (!streamInfo?.name) return 'video/mp4';
    const ext = streamInfo.name.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'mp4': 'video/mp4',
      'mkv': 'video/x-matroska',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'flv': 'video/x-flv',
      'webm': 'video/webm',
    };
    return typeMap[ext || ''] || 'video/mp4';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', padding: 100 }}>
      <Title level={4} type="danger">{error}</Title>
      <Button onClick={() => navigate('/')}>返回文件列表</Button>
    </div>;
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回</Button>
        <Title level={4} style={{ margin: 0 }}>{streamInfo?.name || '视频播放'}</Title>
        <span style={{ color: '#666', fontSize: 12 }}>
          {streamInfo?.storage_mode === 'index' ? '📁 索引模式' : '☁️ 云端模式'}
        </span>
      </div>

      <div style={{
        padding: '12px 16px',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Typography.Text type="secondary">
          如浏览器无法播放此格式（提示没有画面），可使用外部播放器
        </Typography.Text>
        <Space>
          <Button icon={<CopyOutlined />} onClick={copyStreamUrl} size="small">
            复制地址
          </Button>
          <Button icon={<PlayCircleOutlined />} onClick={openInNewTab} size="small">
            新窗口打开
          </Button>
        </Space>
      </div>

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        aspectRatio: '16 / 9',
        backgroundColor: '#000',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          controls
          autoPlay
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          crossOrigin="anonymous"
        >
          {videoUrl && <source src={videoUrl} type={getVideoType()} />}
          您的浏览器不支持视频播放
        </video>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
        💡 提示：如视频只有声音没有画面，说明此视频编码（H.265/HEVC）浏览器不支持，请使用"复制地址"按钮复制后用 VLC 等播放器打开
      </div>
    </div>
  );
}
