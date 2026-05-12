// Download Queue Component
// Shows progress for multiple concurrent downloads
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Pause, Play, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

const DownloadQueue = () => {
  const [queue, setQueue] = useState([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const ws = new WebSocket('ws://localhost:9000/api/ws');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'progress') {
        setQueue(prev => prev.map(item => 
          item.id === data.id 
            ? { ...item, progress: data.progress, status: data.status }
            : item
        ));
      } else if (data.type === 'completed') {
        setQueue(prev => prev.map(item => 
          item.id === data.id 
            ? { ...item, progress: 100, status: 'completed' }
            : item
        ));
      } else if (data.type === 'error') {
        setQueue(prev => prev.map(item => 
          item.id === data.id 
            ? { ...item, status: 'error', error: data.error }
            : item
        ));
      }
    };

    // Load existing queue
    fetchQueue();

    return () => ws.close();
  }, []);

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/queue');
      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    }
  };

  const removeFromQueue = async (id) => {
    try {
      await fetch(`/api/queue/${id}`, { method: 'DELETE' });
      setQueue(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  };

  const pauseDownload = async (id) => {
    try {
      await fetch(`/api/queue/${id}/pause`, { method: 'POST' });
      setQueue(prev => prev.map(item => 
        item.id === id ? { ...item, status: 'paused' } : item
      ));
    } catch (error) {
      console.error('Failed to pause download:', error);
    }
  };

  const resumeDownload = async (id) => {
    try {
      await fetch(`/api/queue/${id}/resume`, { method: 'POST' });
      setQueue(prev => prev.map(item => 
        item.id === id ? { ...item, status: 'downloading' } : item
      ));
    } catch (error) {
      console.error('Failed to resume download:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'downloading':
        return <Download className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Download className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'downloading':
        return 'border-blue-500 bg-blue-900/20';
      case 'completed':
        return 'border-green-500 bg-green-900/20';
      case 'paused':
        return 'border-yellow-500 bg-yellow-900/20';
      case 'error':
        return 'border-red-500 bg-red-900/20';
      default:
        return 'border-gray-500 bg-gray-900/20';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800 rounded-lg border border-gray-700"
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3">
          <Download className="w-5 h-5 text-blue-400" />
          <span className="font-semibold">Download Queue</span>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {queue.length}
          </span>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-gray-400"
        >
          ▼
        </motion.div>
      </div>

      {/* Queue Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {queue.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No downloads in queue</p>
                </div>
              ) : (
                queue.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${getStatusColor(item.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(item.status)}
                        <div>
                          <div className="font-medium text-white">{item.title}</div>
                          <div className="text-sm text-gray-400">
                            {item.platform} • {item.quality}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.status === 'downloading' && (
                          <button
                            onClick={() => pauseDownload(item.id)}
                            className="p-1 hover:bg-gray-600 rounded"
                          >
                            <Pause className="w-4 h-4 text-yellow-400" />
                          </button>
                        )}
                        {item.status === 'paused' && (
                          <button
                            onClick={() => resumeDownload(item.id)}
                            className="p-1 hover:bg-gray-600 rounded"
                          >
                            <Play className="w-4 h-4 text-green-400" />
                          </button>
                        )}
                        <button
                          onClick={() => removeFromQueue(item.id)}
                          className="p-1 hover:bg-gray-600 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {item.status === 'downloading' && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm text-gray-400 mb-1">
                          <span>{item.progress || 0}%</span>
                          <span>{item.speed || '0 MB/s'}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            className="bg-blue-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress || 0}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {item.status === 'error' && (
                      <div className="mt-2 text-sm text-red-400">
                        {item.error || 'Download failed'}
                      </div>
                    )}

                    {/* Completed */}
                    {item.status === 'completed' && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm text-green-400">Download completed</span>
                        <button className="text-blue-400 hover:text-blue-300 text-sm">
                          Open File
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DownloadQueue;