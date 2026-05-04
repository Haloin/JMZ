import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Youtube,
  Instagram,
  Twitter,
  Music2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useDownloadStore } from '../store/downloadStore';
import { extractVideo } from '../api/client';

const PLATFORM_ICONS = {
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  tiktok: Music2,
};

const PLATFORM_PATTERNS = [
  { pattern: /youtube\.com|youtu\.be/, name: 'youtube', color: 'text-red-500' },
  { pattern: /instagram\.com/, name: 'instagram', color: 'text-pink-500' },
  { pattern: /twitter\.com|x\.com/, name: 'twitter', color: 'text-blue-400' },
  { pattern: /tiktok\.com/, name: 'tiktok', color: 'text-cyan-400' },
];

const URLInput = () => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState(null);

  const { analyzing, setAnalyzing, setCurrentVideo, addToQueue } = useDownloadStore();

  useEffect(() => {
    if (!url) {
      setDetectedPlatform(null);
      return;
    }
    const match = PLATFORM_PATTERNS.find(({ pattern }) => pattern.test(url));
    setDetectedPlatform(match ? { name: match.name, color: match.color } : { name: 'default', color: 'text-violet' });
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
    } catch {
      toast.error('Clipboard access denied â€” paste manually');
    }
  };

  const handleAnalyze = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Please enter a URL');
      return;
    }

    setAnalyzing(true);
    const toastId = toast.loading('Analyzing video...');
    try {
      const videoInfo = await extractVideo(trimmed);
      setCurrentVideo(videoInfo);
      toast.success('Video found!', { id: toastId });
    } catch (error) {
      toast.error(error.message, { id: toastId });
    } finally {
      setAnalyzing(false);
    }
  }, [url, setAnalyzing, setCurrentVideo]);

  const handleQueue = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error('Please enter a URL');
      return;
    }
    addToQueue(trimmed);
    setUrl('');
    toast.success('Added to queue');
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && url && document.activeElement.tagName === 'INPUT') {
        handleAnalyze();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [url, handleAnalyze]);

  const PlatformIcon =
    detectedPlatform && detectedPlatform.name !== 'default'
      ? PLATFORM_ICONS[detectedPlatform.name] || Link2
      : Link2;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative glass-strong rounded-3xl p-2"
      >
        <div className="flex items-center gap-2 bg-black-100/50 rounded-2xl p-2">
          <motion.div
            key={detectedPlatform?.name || 'default'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 ${
              detectedPlatform?.color || 'text-secondary'
            }`}
          >
            {analyzing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <PlatformIcon className="w-6 h-6" />
            )}
          </motion.div>

          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a video URL (YouTube, TikTok, Instagram, Twitterâ€¦)"
            className="flex-1 bg-transparent text-white placeholder-secondary text-base px-4 py-3 outline-none"
            disabled={analyzing}
          />

          <AnimatePresence mode="wait">
            {url && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setUrl('')}
                className="p-2 rounded-xl hover:bg-white/10 text-secondary transition-colors"
                aria-label="Clear"
              >
                <X className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePaste}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-secondary transition-colors"
            title="Paste from clipboard"
          >
            <ClipboardPaste className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="flex items-center justify-between mt-4 px-2 pb-2">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            YouTube Â· TikTok Â· Instagram Â· Twitter Â· Reddit
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleQueue}
              disabled={!url || analyzing}
              className="px-5 py-2.5 rounded-xl glass text-white text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Add to Queue
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={!url || analyzing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet to-violet-dark text-white text-sm font-medium glow-violet disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzingâ€¦
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Analyze
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-4 mt-5 text-sm text-secondary"
      >
        <span className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 rounded bg-white/5 text-xs font-mono">Enter</kbd>
          to analyze
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="w-4 h-4" />
          No installation needed
        </span>
      </motion.div>
    </div>
  );
};

export default URLInput;


