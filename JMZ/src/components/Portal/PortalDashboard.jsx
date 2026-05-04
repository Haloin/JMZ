import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Zap,
  Lock,
  Globe,
  Download,
  Clock,
  HardDrive,
  Crown,
  LogOut,
  User,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useDownloadStore } from '../../store/downloadStore';
import URLInput from '../URLInput';
import VideoPreview from '../VideoPreview';
import DownloadQueue from '../DownloadQueue';

const TIER_BADGES = {
  free: { color: 'bg-gray-500/20 border-gray-500/30 text-gray-300', icon: User, label: 'Free' },
  basic: { color: 'bg-blue-500/20 border-blue-500/30 text-blue-300', icon: Zap, label: 'Basic' },
  pro: { color: 'bg-violet/20 border-violet/30 text-violet-light', icon: Crown, label: 'Pro' },
  private: { color: 'bg-pink-500/20 border-pink-500/30 text-pink-300', icon: Shield, label: 'Private' },
};

const StatCard = ({ icon: Icon, label, value, sub }) => (
  <div className="glass rounded-2xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-secondary text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {sub && <p className="text-xs text-secondary mt-1">{sub}</p>}
      </div>
      <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-violet" />
      </div>
    </div>
  </div>
);

const formatBytes = (bytes) => {
  if (!bytes) return '0 MB';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
};

const PortalDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { currentVideo, downloads } = useDownloadStore();
  const [userData, setUserData] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch {
        // Use cached user data
        setUserData(user);
      } finally {
        setLoadingUser(false);
      }
    };
    load();
  }, [user]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/');
  };

  const u = userData || user;
  const tier = u?.subscription_tier || 'free';
  const badge = TIER_BADGES[tier] || TIER_BADGES.free;
  const BadgeIcon = badge.icon;
  const downloadsUsed = u?.downloads_used ?? 0;
  const downloadsLimit = u?.downloads_limit ?? 10;
  const storageUsed = u?.storage_used_bytes ?? 0;
  const storageLimit = u?.storage_limit_bytes ?? 1073741824;
  const downloadsRemaining = Math.max(0, downloadsLimit - downloadsUsed);
  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0;

  return (
    <div className="min-h-screen bg-primary">
      <nav className="border-b border-white/10 bg-primary/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet to-violet-dark flex items-center justify-center">
              <Download className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">VidSnatch Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${badge.color}`}>
              <BadgeIcon className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{badge.label}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg glass text-secondary hover:text-white transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back{u?.email ? `, ${u.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-secondary mt-1">Your private download dashboard</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Download}
            label="Downloads Used"
            value={downloadsUsed}
            sub={`of ${downloadsLimit === -1 ? 'unlimited' : downloadsLimit}`}
          />
          <StatCard
            icon={Zap}
            label="Remaining"
            value={downloadsLimit === -1 ? 'âˆž' : downloadsRemaining}
            sub="this month"
          />
          <StatCard
            icon={HardDrive}
            label="Storage Used"
            value={formatBytes(storageUsed)}
            sub={`${storagePercent}% of ${formatBytes(storageLimit)}`}
          />
          <StatCard
            icon={Shield}
            label="Proxy"
            value={tier === 'private' ? 'Active' : 'Off'}
            sub={tier !== 'private' ? 'Upgrade to enable' : 'Rotating IPs'}
          />
        </div>

        {tier !== 'private' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 border border-violet/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-violet" />
              <div>
                <p className="text-white font-medium">Unlock unlimited downloads & full privacy</p>
                <p className="text-secondary text-sm">Upgrade to Private for proxy rotation, no logging, and unlimited bandwidth</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/pricing')}
              className="ml-4 px-4 py-2 rounded-lg bg-gradient-to-r from-violet to-violet-dark text-white text-sm font-medium hover:opacity-90 transition-opacity flex-shrink-0"
            >
              Upgrade
            </button>
          </motion.div>
        )}

        <div className="glass-strong rounded-3xl p-6 md:p-8">
          <h2 className="text-xl font-bold text-white mb-6">Download a Video</h2>
          <URLInput />
          {currentVideo && <VideoPreview video={currentVideo} />}
        </div>

        {downloads.length > 0 && (
          <div className="glass-strong rounded-3xl p-6 md:p-8">
            <DownloadQueue />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/pricing')}
            className="glass rounded-2xl p-5 flex items-center gap-4 hover:bg-white/10 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-violet" />
            </div>
            <div>
              <p className="text-white font-medium">Manage Subscription</p>
              <p className="text-secondary text-sm">View plans, upgrade or cancel</p>
            </div>
          </button>

          <div className="glass rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-violet" />
            </div>
            <div>
              <p className="text-white font-medium">Proxy Status</p>
              <p className={`text-sm ${tier === 'private' ? 'text-green-400' : 'text-secondary'}`}>
                {tier === 'private' ? 'Rotating â€” Active' : 'Not available on this plan'}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PortalDashboard;


