export const APP_NAME='Secure Offline Communication';
export const API_URL=import.meta.env.VITE_API_URL||'http://localhost:5000/api';
export const WS_URL=import.meta.env.VITE_WS_URL||'http://localhost:5000';
export const SOCKET_PATH=import.meta.env.VITE_SOCKET_PATH||'/chat';
export const STORAGE_KEYS={auth:'offline-chat-auth',settings:'offline-chat-settings',messages:'offline-chat-messages'} as const;
