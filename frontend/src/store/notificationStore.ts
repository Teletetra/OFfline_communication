import { create } from 'zustand';

interface NotificationPayload { title: string; body: string; data?: Record<string, unknown>; }
interface NotificationState { permission: NotificationPermission | 'unsupported'; showNotification: (payload: NotificationPayload) => void; requestPermission: () => Promise<void>; }

export const useNotificationStore = create<NotificationState>((set) => ({
  permission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  requestPermission: async () => {
    if (typeof Notification === 'undefined') { set({ permission: 'unsupported' }); return; }
    const permission = await Notification.requestPermission();
    set({ permission });
  },
  showNotification: ({ title, body, data }) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const notification = new Notification(title, { body, tag: String(data?.conversationId || 'chat') });
    notification.onclick = () => { window.focus(); notification.close(); };
  },
}));
