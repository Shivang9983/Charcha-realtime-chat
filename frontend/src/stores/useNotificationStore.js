import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],

  showInAppNotification: (senderName, senderAvatar, messagePreview, conversation) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    set((state) => ({
      // Keep only last 3 notifications to avoid clutter
      notifications: [...state.notifications, { id, senderName, senderAvatar, messagePreview, conversation }].slice(-3),
    }));

    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    }, 4500);
  },

  dismissNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
}));
