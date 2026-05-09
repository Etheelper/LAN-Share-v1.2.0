import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import MainLayout from '@/pages/MainLayout';
import FileManager from '@/pages/FileManager';
import UploadCenter from '@/pages/UploadCenter';
import VideoPlayer from '@/pages/VideoPlayer';
import AdminPanel from '@/pages/AdminPanel';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>
        <Route index element={<FileManager />} />
        <Route path="upload" element={<UploadCenter />} />
        <Route path="player" element={<VideoPlayer />} />
        <Route path="admin" element={<AdminPanel />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
