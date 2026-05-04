import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';

import Navbar from './components/Navbar';
import Hero from './components/Hero';
import URLInput from './components/URLInput';
import VideoPreview from './components/VideoPreview';
import DownloadQueue from './components/DownloadQueue';
import History from './components/History';
import Particles from './components/canvas/Particles';

import { Login, Register } from './components/Auth';
import { PortalDashboard } from './components/Portal';
import { Pricing } from './components/Pricing';
import { AdminDashboard } from './components/Admin/AdminDashboard';

import { useDownloadStore } from './store/downloadStore';
import { useAuthStore } from './store/authStore';

const Home = () => {
  const { currentVideo, downloads } = useDownloadStore();

  return (
    <div className="relative min-h-screen bg-primary overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles />
      </div>

      <Navbar />

      <main className="relative z-10">
        <Hero />

        <section id="download-section" className="relative py-20 px-6 sm:px-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="text-gradient">Paste & Download</span>
              </h2>
              <p className="text-secondary text-lg max-w-2xl mx-auto">
                YouTube, TikTok, Instagram, Twitter, Reddit and more.
                <br />
                Up to 4K quality. No watermark. No limits.
              </p>
            </div>

            <URLInput />

            {currentVideo && <VideoPreview video={currentVideo} />}
          </div>
        </section>

        {downloads.length > 0 && (
          <section className="py-20 px-6 sm:px-16">
            <div className="max-w-7xl mx-auto">
              <DownloadQueue />
            </div>
          </section>
        )}

        <section className="py-20 px-6 sm:px-16">
          <div className="max-w-7xl mx-auto">
            <History />
          </div>
        </section>
      </main>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const { fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <ErrorBoundary>
      <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#151030',
            color: '#fff',
            border: '1px solid rgba(145, 94, 255, 0.3)',
          },
        }}
      />
      </Router>
    </ErrorBoundary>
  );
}

export default App;


