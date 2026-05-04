import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History as HistoryIcon,
  Trash2,
  Download,
  Search,
  Calendar,
  FileVideo,
  Music,
  Filter,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import { useDownloadStore } from '../store/downloadStore';

const HistoryItem = ({ item, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const isAudio = item.quality === 'audio';
  const Icon = isAudio ? Music : FileVideo;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -60 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass rounded-2xl p-4 hover:bg-white/10 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-12 rounded-xl bg-black-100 flex-shrink-0 overflow-hidden">
          {item.thumbnail ? (
            <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-6 h-6 text-secondary" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate text-sm">{item.title || 'Unknown'}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-secondary">
            {item.completedAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(item.completedAt), 'MMM d, yyyy')}
              </span>
            )}
            {item.quality && (
              <span className="px-1.5 py-0.5 rounded bg-white/5">{item.quality}</span>
            )}
            {item.platform && (
              <span className="capitalize text-violet-light">{item.platform}</span>
            )}
          </div>
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-1"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(item.id)}
                className="p-2 rounded-xl hover:bg-white/10 text-secondary hover:text-red-400 transition-colors"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const History = () => {
  const { history, clearHistory, deleteFromHistory } = useDownloadStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = history.filter((item) => {
    const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'video') return matchesSearch && item.quality !== 'audio';
    if (filter === 'audio') return matchesSearch && item.quality === 'audio';
    return matchesSearch;
  });

  const handleClear = () => {
    if (!window.confirm('Clear all download history?')) return;
    clearHistory();
    toast.success('History cleared');
  };

  const handleDelete = (id) => {
    deleteFromHistory(id);
    toast.success('Removed from history');
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="text-white">Download</span>{' '}
            <span className="text-gradient">History</span>
          </h2>
          <p className="text-secondary">{filtered.length} downloads</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Searchâ€¦"
              className="pl-10 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-secondary text-sm focus:border-violet transition-colors outline-none w-48"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-colors ${
              showFilters ? 'bg-violet text-white' : 'glass text-secondary hover:text-white'
            }`}
            title="Filter"
          >
            <Filter className="w-5 h-5" />
          </button>

          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 rounded-xl glass text-secondary hover:text-red-400 transition-colors"
              title="Clear history"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pb-2">
              {['all', 'video', 'audio'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${
                    filter === f ? 'bg-violet text-white' : 'bg-white/5 text-secondary hover:bg-white/10'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length > 0 ? (
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <HistoryItem key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <HistoryIcon className="w-10 h-10 text-secondary" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'No results' : 'No history yet'}
          </h3>
          <p className="text-secondary">
            {searchQuery ? 'Try a different search term' : 'Completed downloads will appear here'}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default History;


