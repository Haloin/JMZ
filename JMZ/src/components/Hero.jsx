import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Zap, Globe, Video, Shield, Lock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stats = [
  { icon: Video, label: 'Videos Downloaded', value: '1M+' },
  { icon: Globe, label: 'Supported Sites', value: '50+' },
  { icon: Zap, label: 'Avg Speed', value: '100 MB/s' },
];

const features = [
  { icon: Shield, label: 'Proxy Rotation', desc: 'Stay anonymous' },
  { icon: Lock, label: 'Encrypted', desc: 'AES-256 streams' },
  { icon: Eye, label: 'No Logging', desc: 'Private tier only' },
];

const TYPEWRITER_TEXT = 'Private. Secure. Unlimited.';

const Hero = () => {
  const navigate = useNavigate();
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i <= TYPEWRITER_TEXT.length) {
        setTyped(TYPEWRITER_TEXT.slice(0, i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 sm:px-16 overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 bg-violet/20 rounded-full blur-3xl animate-float pointer-events-none" />
      <div
        className="absolute bottom-20 right-10 w-96 h-96 bg-violet-dark/20 rounded-full blur-3xl animate-float pointer-events-none"
        style={{ animationDelay: '2s' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-secondary">Now with 4K support on all plans</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
        >
          <span className="text-white">VidSnatch</span>
          <br />
          <span className="text-gradient">Video Downloader</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-xl sm:text-2xl text-secondary mb-8 h-8"
        >
          {typed}
          <span className="animate-pulse text-violet">|</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <motion.button
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet to-violet-dark text-white font-semibold text-lg shadow-lg shadow-violet/30 hover:shadow-violet/50 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
          >
            <Shield className="w-5 h-5" />
            Get Private Access
          </motion.button>

          <motion.button
            className="flex items-center gap-3 px-8 py-4 rounded-2xl glass text-white font-semibold text-lg hover:bg-white/10 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() =>
              document.getElementById('download-section')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <Download className="w-5 h-5" />
            Try Free
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-12"
        >
          {['YouTube', 'TikTok', 'Instagram', 'Twitter', 'Reddit', 'Vimeo'].map((platform, i) => (
            <motion.div
              key={platform}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
              className="px-4 py-2 rounded-xl glass text-sm text-secondary hover:text-white hover:bg-white/10 transition-all cursor-default"
            >
              {platform}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="flex flex-wrap items-center justify-center gap-6 mb-16"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 1.0 + i * 0.1 }}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-violet/10 border border-violet/20"
              >
                <Icon className="w-5 h-5 text-violet" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{feature.label}</p>
                  <p className="text-xs text-violet-light">{feature.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 1.1 + i * 0.1 }}
            >
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-xl bg-violet/20 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-violet" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-secondary">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;


