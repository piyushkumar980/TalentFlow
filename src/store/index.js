import { create } from 'zustand';

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useToastStore = create((set, get) => ({
  toasts: [],
  
  push: (msg, type = 'info', opts = {}) => {
    const id = opts.id || uid();
    const duration =
      typeof opts.duration === 'number' ? opts.duration : 1500; // auto-dismiss after 1.5s

    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));

    if (duration > 0) {
      setTimeout(() => {
        const remove = get().remove;
        remove?.(id);
      }, duration);
    }

    return id;
  },

  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));
