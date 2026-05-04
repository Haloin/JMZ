import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const extractVideo = async (url) => {
  try {
    const response = await apiClient.post('/extract', { url });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to extract video info');
  }
};

export const startDownload = async (videoInfo, options = {}) => {
  try {
    const response = await apiClient.post('/download', {
      url: videoInfo.url,
      title: videoInfo.title,
      quality: options.quality || 'best',
      format: options.format || 'mp4',
      audio_only: options.audioOnly || false,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to start download');
  }
};

export const createProgressStream = (downloadId, onProgress, onComplete, onError) => {
  const url = `${API_BASE_URL}/api/progress/${downloadId}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.status === 'completed') {
        onComplete?.(data);
        eventSource.close();
      } else if (data.status === 'error') {
        onError?.(data.error || 'Download failed');
        eventSource.close();
      } else {
        onProgress?.(data);
      }
    } catch {
      onError?.('Invalid progress data');
      eventSource.close();
    }
  };

  eventSource.onerror = () => {
    onError?.('Connection lost');
    eventSource.close();
  };

  return eventSource;
};

export const cancelDownload = async (downloadId) => {
  try {
    await apiClient.delete(`/cancel/${downloadId}`);
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to cancel download');
  }
};

export const getHistory = async () => {
  try {
    const response = await apiClient.get('/history');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch history');
  }
};

export const getFormats = async (url) => {
  try {
    const response = await apiClient.post('/formats', { url });
    return response.data.formats;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to get formats');
  }
};

export default apiClient;


