import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Download,
  X,
  Check,
  FileAudio,
  Video,
  Settings2,
  Clock,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useDownloadStore } from '../store/downloadStore';
import { startDownload, createProgressStream } from '../api/client';

const QUALITY_OPTIONS = [
  { value: '4k', label: '4K (2160p)', size: '~200 MB/min', badge: 'HDR' },
  { value: '1080p', label: '1080p HD', size: '~50 MB/min' },
  { value: '720p', label: '720p HD', size: '~25 MB/min' },
  { value: '480p', label: '480p', size: '~15 MB/min' },
  { value: 'audio', label: 'Audio Only', size: '~5 MB/min', icon: FileAudio },
];

const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4', desc: 'Best compatibility' },
  { value: 'webm', label: 'WebM', desc: 'Smaller size' },
  { value: 'mkv', label: 'MKV', desc: 'Multiple tracks' },
];

const VideoPreview = ({ video }) => {
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [showSettings, setShowSettings] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { setCurrentVideo, addDownload, updateDownload, completeDownload } = useDownloadStore();

  const handleClose = () => setCurrentVideo(null);

  const handleDownload = async () => {
    setDownloading(true);
    const toastId = toast.loading('Starting downloadâ€¦');

    try {
      const downloadInfo = await startDownload(video, {
        quality: selectedQuality,
        format: selectedFormat,
        audioOnly: selectedQuality === 'audio',
      });

      addDownload({
        id: downloadInfo.id,
        title: video.title,
        thumbnail: video.thumbnail,
        quality: selectedQuality,
        platform: video.platform,
      });

      toast.success('Download started!', { id: toastId });
      handleClose();

      createProgressStream(
        downloadInfo.id,
        (progress) => updateDownload(downloadInfo.id, progress),
        () => {
          completeDownload(downloadInfo.id);
          toast.success(`Saved: ${video.title}`);
        },
        (error) => toast.error(`Download failed: ${error}`)
      );
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  const duration = video.duration
    ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      className="mt-8"
    >
      <div className="glass-strong rounded-3xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-secondary">Video ready to download</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-white/10 text-secondary transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div className="relative group">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black-100">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-16 h-16 text-secondary" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-violet/90 flex items-center justify-center glow-violet">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>

              {duration && (
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 text-xs text-white">
                  {duration}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-3 text-sm text-secondary">
              {video.views && (
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {video.views} views
                </span>
              )}
              {video.uploadDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {video.uploadDate}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-white line-clamp-2">{video.title}</h3>
              {video.author && <p className="text-secondary mt-1">{video.author}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-secondary">Quality</label>
              <div className="grid grid-cols-2 gap-2">
                {QUALITY_OPTIONS.map((option) => (
                  <motion.button
                    key={option.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedQuality(option.value)}
                    className={`relative p-3 rounded-xl text-left transition-all ${
                      selectedQuality === option.value
                        ? 'bg-violet/20 border border-violet'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        {option.icon && <option.icon className="w-4 h-4" />}
                        {option.label}
                      </span>
                      {selectedQuality === option.value && (
                        <Check className="w-4 h-4 text-violet" />
                      )}
                    </div>
                    <p className="text-xs text-secondary mt-1">{option.size}</p>
                    {option.badge && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-violet/30 text-[10px] text-violet-light">
                        {option.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    <label className="text-sm text-secondary">Format</label>
                    <div className="flex gap-2">
                      {FORMAT_OPTIONS.map((format) => (
                        <button
                          key={format.value}
                          onClick={() => setSelectedFormat(format.value)}
                          className={`px-4 py-2 rounded-xl text-sm transition-all ${
                            selectedFormat === format.value
                              ? 'bg-violet text-white'
                              : 'bg-white/5 text-secondary hover:bg-white/10'
                          }`}
                        >
                          {format.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowSettings(!showSettings)}
                className={`p-3 rounded-xl transition-colors ${
                  showSettings ? 'bg-violet/20 text-violet' : 'glass text-secondary hover:text-white'
                }`}
                title="Format settings"
              >
                <Settings2 className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={downloading}
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet to-violet-dark text-white font-semibold glow-violet disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {downloading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Startingâ€¦
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    {selectedQuality === 'audio' ? 'Download Audio' : `Download ${selectedQuality}`}
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPreview;


