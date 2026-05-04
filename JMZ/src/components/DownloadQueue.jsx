import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  CheckCircle2,
  Clock,
  HardDrive,
  Zap,
  AlertCircle,
  Pause,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useDownloadStore } from '../store/downloadStore';
import { cancelDownload } from '../api/client';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Queued' },
  downloading: { icon: Download, color: 'text-violet', label: 'Downloading' },
  processing: { icon: Zap, color: 'text-blue-400', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-green-500', label: 'Completed' },
  error: { icon: AlertCircle, color: 'text-red-500', label: 'Failed' },
  paused: { icon: Pause, color: 'text-yellow-500', label: 'Paused' },
};

const formatSpeed = (speed) => {
  if (!speed) return '';
  if (speed > 1024 * 1024) return `${(speed / 1024 / 1024).toFixed(1)} MB/s`;
  return `${(speed / 1024).toFixed(1)} KB/s`;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const ProgressBar = ({ progress, status }) => {
  const color =
    status === 'completed'
      ? 'bg-green-500'
      : status === 'error'
      ? 'bg-red-500'
      : status === 'paused'
      ? 'bg-yellow-500'
      : 'bg-violet';

  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
};

const DownloadCard = ({ download }) => {
  const { cancelDownload: cancelLocal, removeDownload } = useDownloadStore();

  const handleCancel = async () => {
    try {
      await cancelDownload(download.id);
      cancelLocal(download.id);
      toast.success('Download cancelled');
    } catch {
      cancelLocal(download.id);
    }
  };

  const cfg = STATUS_CONFIG[download.status] || STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="glass rounded-2xl p-4"
    >
      <div className="flex items-start gap-4">
        <div className="w-24 h-16 rounded-xl bg-black-100 flex-shrink-0 overflow-hidden">
          {download.thumbnail ? (
            <img src={download.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Download className="w-6 h-6 text-secondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{download.title || 'Downloadingâ€¦'}</h4>
          <div className="flex items-center gap-3 mt-1 text-sm text-secondary">
            <span className={`flex items-center gap-1 ${cfg.color}`}>
              <StatusIcon className="w-4 h-4" />
              {cfg.label}
            </span>
            {download.quality && (
              <span className="px-2 py-0.5 rounded bg-white/5 text-xs">{download.quality}</span>
            )}
          </div>

          {download.status === 'downloading' && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-secondary mb-1.5">
                <span>{(download.progress || 0).toFixed(1)}%</span>
                <div className="flex items-center gap-2">
                  {download.speed > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {formatSpeed(download.speed)}
                    </span>
                  )}
                  {download.downloadedBytes && download.totalBytes && (
                    <span>
                      {formatSize(download.downloadedBytes)} / {formatSize(download.totalBytes)}
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar progress={download.progress || 0} status={download.status} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {['downloading', 'pending'].includes(download.status) && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCancel}
              className="p-2 rounded-xl hover:bg-white/10 text-secondary hover:text-red-400 transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
          {download.status === 'completed' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => removeDownload(download.id)}
              className="p-2 rounded-xl hover:bg-white/10 text-secondary hover:text-red-400 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const DownloadQueue = () => {
  const { downloads, queue, removeFromQueue } = useDownloadStore();

  const activeDownloads = downloads.filter((d) =>
    ['downloading', 'processing', 'pending'].includes(d.status)
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-2">
          <span className="text-white">Download</span>{' '}
          <span className="text-gradient">Queue</span>
        </h2>
        <p className="text-secondary">
          {activeDownloads.length} active Â· {queue.length} queued
        </p>
      </motion.div>

      {activeDownloads.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet" />
            Active
          </h3>
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {activeDownloads.map((d) => (
                <DownloadCard key={d.id} download={d} />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {queue.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Waiting ({queue.length})
          </h3>
          <div className="glass rounded-2xl p-4 space-y-2">
            {queue.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-secondary">
                    {index + 1}
                  </span>
                  <span className="text-sm text-secondary truncate max-w-sm">{item.url}</span>
                </div>
                <button
                  onClick={() => removeFromQueue(item.id)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-secondary hover:text-red-400 transition-colors"
                  aria-label="Remove from queue"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeDownloads.length === 0 && queue.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <HardDrive className="w-8 h-8 text-secondary" />
          </div>
          <p className="text-secondary">No active downloads</p>
          <p className="text-sm text-secondary/60 mt-1">Paste a URL above to get started</p>
        </motion.div>
      )}
    </div>
  );
};

export default DownloadQueue;


