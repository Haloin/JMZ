import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const MAX_HISTORY = 50;

export const useDownloadStore = create(
  immer((set, get) => ({
    currentVideo: null,
    analyzing: false,
    downloads: [],
    history: JSON.parse(localStorage.getItem('downloadHistory') || '[]'),
    queue: [],

    setCurrentVideo: (video) => set({ currentVideo: video }),

    setAnalyzing: (analyzing) => set({ analyzing }),

    addDownload: (download) =>
      set((state) => {
        state.downloads.push({
          ...download,
          progress: 0,
          status: 'pending',
          speed: 0,
          eta: null,
          startTime: Date.now(),
        });
      }),

    updateDownload: (id, updates) =>
      set((state) => {
        const download = state.downloads.find((d) => d.id === id);
        if (download) Object.assign(download, updates);
      }),

    removeDownload: (id) =>
      set((state) => {
        state.downloads = state.downloads.filter((d) => d.id !== id);
      }),

    completeDownload: (id) =>
      set((state) => {
        const index = state.downloads.findIndex((d) => d.id === id);
        if (index !== -1) {
          const download = state.downloads[index];
          const record = { ...download, status: 'completed', progress: 100, completedAt: Date.now() };
          state.history.unshift(record);
          if (state.history.length > MAX_HISTORY) {
            state.history = state.history.slice(0, MAX_HISTORY);
          }
          state.downloads.splice(index, 1);
          localStorage.setItem('downloadHistory', JSON.stringify(state.history));
        }
      }),

    cancelDownload: (id) =>
      set((state) => {
        state.downloads = state.downloads.filter((d) => d.id !== id);
      }),

    addToQueue: (url) =>
      set((state) => {
        state.queue.push({ id: crypto.randomUUID(), url, addedAt: Date.now() });
      }),

    removeFromQueue: (id) =>
      set((state) => {
        state.queue = state.queue.filter((item) => item.id !== id);
      }),

    deleteFromHistory: (id) =>
      set((state) => {
        state.history = state.history.filter((item) => item.id !== id);
        localStorage.setItem('downloadHistory', JSON.stringify(state.history));
      }),

    clearHistory: () =>
      set((state) => {
        state.history = [];
        localStorage.removeItem('downloadHistory');
      }),
  }))
);


